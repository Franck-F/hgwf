'use server';

/**
 * Assistant de saisie du parc.
 *
 * L'utilisateur décrit son entrepôt en français ; l'assistance en tire une
 * proposition structurée. Deux principes tiennent tout le reste :
 *
 *   1. l'assistance PROPOSE, elle n'écrit jamais. Rien ne part en base sans
 *      que quelqu'un ait relu l'écran et cliqué ;
 *   2. tout ce qui revient est revalidé ici comme si ça venait d'un formulaire.
 *      Une réponse de modèle est une saisie utilisateur comme une autre, pas
 *      une source de confiance.
 */
import { revalidatePath } from 'next/cache';
import { serveur } from '@/lib/supabase-serveur';
import { extraire, geminiConfigure } from '@/lib/gemini';

export type Gabarit = {
  nom: string;
  surface_m2: number | null;
  volume_m3: number | null;
  tarif_mensuel_euros: number | null;
};

export type Serie = {
  gabarit: string;
  prefixe: string;
  du: number;
  au: number;
  largeur: number;
  etage: string | null;
};

export type Proposition = {
  local: { nom: string; adresse: string; code_postal: string; ville: string } | null;
  gabarits: Gabarit[];
  series: Serie[];
};

export type Analyse =
  | { ok: true; proposition: Proposition; avertissements: string[] }
  | { ok: false; erreur: string };

const SCHEMA = {
  type: 'object',
  properties: {
    local: {
      type: 'object',
      properties: {
        nom: { type: 'string' },
        adresse: { type: 'string' },
        code_postal: { type: 'string' },
        ville: { type: 'string' },
      },
    },
    gabarits: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nom: { type: 'string' },
          surface_m2: { type: 'number' },
          volume_m3: { type: 'number' },
          tarif_mensuel_euros: { type: 'number' },
        },
        required: ['nom'],
      },
    },
    series: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          gabarit: { type: 'string' },
          prefixe: { type: 'string' },
          du: { type: 'integer' },
          au: { type: 'integer' },
          largeur: { type: 'integer' },
          etage: { type: 'string' },
        },
        required: ['gabarit', 'prefixe', 'du', 'au'],
      },
    },
  },
  required: ['gabarits', 'series'],
};

const CONSIGNE = `Tu transformes la description d'un parc de box de stockage en données structurées.

Règles absolues :
- n'invente AUCUNE valeur absente du texte. Un tarif non dit reste vide, une surface non dite reste vide ;
- ne déduis pas un prix à partir d'une surface, ni l'inverse ;
- "gabarit" désigne une taille vendue (3 m², 6 m²…), "série" un ensemble de box qui se suivent ;
- "prefixe" est ce qui précède le numéro dans le code écrit sur la porte : dans "A-01 à A-12", le préfixe est "A-" ;
- "largeur" est le nombre de chiffres du numéro : "A-01" vaut 2, "A-1" vaut 1 ;
- le champ "gabarit" d'une série doit reprendre exactement le "nom" d'un gabarit de la liste ;
- les tarifs sont mensuels et en euros.`;

export async function analyserParc(_precedent: Analyse | null, form: FormData): Promise<Analyse> {
  if (!geminiConfigure()) {
    return { ok: false, erreur: 'Assistance non configurée sur ce serveur.' };
  }

  const texte = String(form.get('description') ?? '').trim().slice(0, 4000);
  if (texte.length < 15) {
    return { ok: false, erreur: 'Décrivez votre parc en une ou deux phrases.' };
  }

  const reponse = await extraire<Proposition>({ consigne: CONSIGNE, texte, schema: SCHEMA });
  if (!reponse.ok) return { ok: false, erreur: reponse.erreur };

  return nettoyer(reponse.donnees);
}

/** Revalidation complète de ce que l'assistance renvoie. */
function nettoyer(brut: Proposition): Analyse {
  const avertissements: string[] = [];

  const gabarits: Gabarit[] = (brut.gabarits ?? [])
    .filter((g) => g?.nom?.trim())
    .slice(0, 30)
    .map((g) => ({
      nom: String(g.nom).trim().slice(0, 60),
      surface_m2: positifOuNull(g.surface_m2),
      volume_m3: positifOuNull(g.volume_m3),
      tarif_mensuel_euros: positifOuNull(g.tarif_mensuel_euros),
    }));

  if (gabarits.length === 0) {
    return { ok: false, erreur: 'Aucune taille de box reconnue dans cette description.' };
  }

  const nomsConnus = new Set(gabarits.map((g) => g.nom));
  const series: Serie[] = [];

  for (const s of brut.series ?? []) {
    const gabarit = String(s?.gabarit ?? '').trim().slice(0, 60);
    const prefixe = String(s?.prefixe ?? '').trim().slice(0, 20);
    const du = Math.trunc(Number(s?.du));
    const au = Math.trunc(Number(s?.au));

    if (!nomsConnus.has(gabarit)) {
      avertissements.push(`Série « ${prefixe || '?'} » ignorée : taille « ${gabarit} » inconnue.`);
      continue;
    }
    if (!Number.isFinite(du) || !Number.isFinite(au) || du < 0 || au < du) {
      avertissements.push(`Série « ${prefixe || '?'} » ignorée : plage de numéros incohérente.`);
      continue;
    }
    if (au - du + 1 > 300) {
      avertissements.push(`Série « ${prefixe} » ignorée : plus de 300 box d’un coup.`);
      continue;
    }

    const largeurLue = Math.trunc(Number(s?.largeur));
    const largeur =
      Number.isFinite(largeurLue) && largeurLue >= 1 && largeurLue <= 6
        ? largeurLue
        : String(au).length;

    series.push({
      gabarit,
      prefixe,
      du,
      au,
      largeur,
      etage: String(s?.etage ?? '').trim().slice(0, 60) || null,
    });
  }

  for (const g of gabarits) {
    if (g.tarif_mensuel_euros === null) {
      avertissements.push(`Aucun tarif lu pour « ${g.nom} » : à compléter avant de créer.`);
    }
  }

  const l = brut.local;
  const local =
    l && String(l.nom ?? '').trim()
      ? {
          nom: String(l.nom).trim().slice(0, 120),
          adresse: String(l.adresse ?? '').trim().slice(0, 300),
          code_postal: String(l.code_postal ?? '').trim().slice(0, 10),
          ville: String(l.ville ?? '').trim().slice(0, 120),
        }
      : null;

  return { ok: true, proposition: { local, gabarits, series }, avertissements };
}

function positifOuNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* ── Application de la proposition ──────────────────────────────────────── */

export type Application = { ok: true; message: string } | { ok: false; erreur: string };

/**
 * Écrit la proposition relue par l'utilisateur, dans l'ordre des dépendances.
 * Rien n'est écrasé : un local, un gabarit ou un box qui existe déjà est
 * réutilisé, jamais remplacé.
 */
export async function appliquerParc(
  _precedent: Application | null,
  form: FormData,
): Promise<Application> {
  let proposition: Proposition;
  try {
    proposition = JSON.parse(String(form.get('proposition') ?? ''));
  } catch {
    return { ok: false, erreur: 'Proposition illisible. Relancez l’analyse.' };
  }

  const verifiee = nettoyer(proposition);
  if (!verifiee.ok) return { ok: false, erreur: verifiee.erreur };
  const { local, gabarits, series } = verifiee.proposition;

  const client = await serveur();

  // 1. Le local. On réutilise celui qui porte le même nom s'il existe.
  let siteId: string | null = null;
  if (local) {
    const { data: existant } = await client
      .from('site')
      .select('id')
      .eq('nom', local.nom)
      .is('archive_le', null)
      .maybeSingle();

    if (existant) {
      siteId = existant.id;
    } else {
      const { data, error } = await client
        .from('site')
        .insert({
          nom: local.nom,
          adresse: local.adresse || 'À compléter',
          code_postal: local.code_postal || null,
          ville: local.ville || null,
        })
        .select('id')
        .single();
      if (error) return { ok: false, erreur: `Local : ${error.message}` };
      siteId = data.id;
    }
  } else {
    const { data } = await client
      .from('site')
      .select('id')
      .is('archive_le', null)
      .order('cree_le')
      .limit(1)
      .maybeSingle();
    siteId = data?.id ?? null;
  }

  if (!siteId) {
    return { ok: false, erreur: 'Aucun local : précisez-le dans la description, ou créez-le d’abord.' };
  }

  // 2. Les gabarits, et leur tarif de départ.
  const idParNom = new Map<string, string>();
  const aujourdhui = new Date().toISOString().slice(0, 10);

  for (const g of gabarits) {
    const { data: existant } = await client
      .from('categorie_box')
      .select('id')
      .eq('nom', g.nom)
      .is('archive_le', null)
      .maybeSingle();

    let id: string;
    if (existant) {
      id = existant.id;
    } else {
      const { data, error } = await client
        .from('categorie_box')
        .insert({ nom: g.nom, surface_m2: g.surface_m2, volume_m3: g.volume_m3 })
        .select('id')
        .single();
      if (error) return { ok: false, erreur: `Gabarit « ${g.nom} » : ${error.message}` };
      id = data.id;
    }
    idParNom.set(g.nom, id);

    if (g.tarif_mensuel_euros !== null) {
      const { data: dejaTarife } = await client
        .from('tarif')
        .select('id')
        .eq('categorie_id', id)
        .limit(1)
        .maybeSingle();

      // On ne pose un tarif que si la catégorie n'en a aucun : modifier un prix
      // existant est une décision, elle passe par le formulaire dédié.
      if (!dejaTarife) {
        await client.from('tarif').insert({
          categorie_id: id,
          montant_mensuel_cents: Math.round(g.tarif_mensuel_euros * 100),
          applicable_du: aujourdhui,
        });
      }
    }
  }

  // 3. Les box. Les codes déjà pris sont sautés, pas écrasés : la contrainte
  // d'unicité de la base ferait échouer toute la série pour un seul doublon.
  const { data: dejaLa } = await client.from('box').select('code').eq('site_id', siteId);
  const pris = new Set((dejaLa ?? []).map((b) => b.code as string));

  const lignes: { site_id: string; categorie_id: string; code: string; etage: string | null }[] = [];
  let sautes = 0;

  for (const s of series) {
    const categorieId = idParNom.get(s.gabarit);
    if (!categorieId) continue;
    for (let n = s.du; n <= s.au; n += 1) {
      const code = `${s.prefixe}${String(n).padStart(s.largeur, '0')}`;
      if (pris.has(code)) {
        sautes += 1;
        continue;
      }
      pris.add(code);
      lignes.push({ site_id: siteId, categorie_id: categorieId, code, etage: s.etage });
    }
  }

  if (lignes.length > 0) {
    const { error } = await client.from('box').insert(lignes);
    if (error) return { ok: false, erreur: `Box : ${error.message}` };
  }

  revalidatePath('/parametrage');
  revalidatePath('/');

  const morceaux = [
    `${gabarits.length} gabarit${gabarits.length > 1 ? 's' : ''}`,
    `${lignes.length} box créé${lignes.length > 1 ? 's' : ''}`,
  ];
  if (sautes > 0) morceaux.push(`${sautes} code${sautes > 1 ? 's' : ''} déjà pris, sauté${sautes > 1 ? 's' : ''}`);

  return { ok: true, message: `${morceaux.join(', ')}.` };
}
