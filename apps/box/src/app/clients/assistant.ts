'use server';

/**
 * Saisie de clients en texte libre — une phrase dictée, ou un bloc collé depuis
 * un tableur pour reprendre un fichier existant.
 *
 * C'est le seul endroit du dossier client où une assistance a sa place : du
 * texte non structuré doit devenir de la donnée structurée. Le calcul des
 * loyers, lui, reste déterministe, et le texte des relances reste fixe — une
 * assistance qui les ferait varier serait un risque, pas un service.
 *
 * Deux principes, les mêmes que pour le parc :
 *   1. elle PROPOSE, elle n'écrit jamais. Rien ne part en base sans relecture ;
 *   2. tout ce qui revient est revalidé ici comme une saisie ordinaire.
 */
import { revalidatePath } from 'next/cache';
import { serveur } from '@/lib/supabase-serveur';
import { extraire, geminiConfigure } from '@/lib/gemini';

export type FicheProposee = {
  type: 'particulier' | 'societe';
  nom: string;
  raison_sociale: string | null;
  siret: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
};

export type AnalyseClients =
  | { ok: true; fiches: FicheProposee[]; avertissements: string[] }
  | { ok: false; erreur: string };

const SCHEMA = {
  type: 'object',
  properties: {
    fiches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['particulier', 'societe'] },
          nom: { type: 'string' },
          raison_sociale: { type: 'string' },
          siret: { type: 'string' },
          email: { type: 'string' },
          telephone: { type: 'string' },
          adresse: { type: 'string' },
          code_postal: { type: 'string' },
          ville: { type: 'string' },
        },
        required: ['nom'],
      },
    },
  },
  required: ['fiches'],
};

const CONSIGNE = `Tu transformes du texte libre en fiches clients pour un loueur de box de stockage.

Le texte peut être une phrase dictée pour une seule personne, ou un bloc collé depuis un tableur contenant plusieurs lignes.

Règles absolues :
- n'invente AUCUNE valeur absente du texte. Un e-mail non dit reste vide, une adresse non dite reste vide ;
- ne déduis pas une adresse depuis un nom de ville, ni un e-mail depuis un nom ;
- "type" vaut "societe" seulement si le texte mentionne une entreprise, une raison sociale, un SIRET ou une forme juridique (SARL, SAS, SCI…). Sinon "particulier" ;
- "nom" est la personne physique : le contact chez une société, ou le particulier lui-même ;
- "raison_sociale" n'est renseigné que pour une société ;
- "siret" ne contient que des chiffres, sans espaces ;
- "telephone" garde le format français lisible, sans indicatif ajouté ;
- une ligne d'en-tête de tableur ("Nom", "Email", "Téléphone"…) n'est pas une fiche : ignore-la.`;

export async function analyserClients(
  _precedent: AnalyseClients | null,
  form: FormData,
): Promise<AnalyseClients> {
  if (!geminiConfigure()) {
    return { ok: false, erreur: 'Assistance non configurée sur ce serveur.' };
  }

  const texte = String(form.get('description') ?? '').trim().slice(0, 12_000);
  if (texte.length < 8) {
    return { ok: false, erreur: 'Décrivez un client, ou collez une liste.' };
  }

  const reponse = await extraire<{ fiches: Partial<FicheProposee>[] }>({
    consigne: CONSIGNE,
    texte,
    schema: SCHEMA,
    delaiMs: 30_000,
  });
  if (!reponse.ok) return { ok: false, erreur: reponse.erreur };

  return nettoyer(reponse.donnees.fiches ?? []);
}

function propre(v: unknown, max: number): string | null {
  const s = String(v ?? '').trim().slice(0, max);
  return s || null;
}

/** Revalidation complète de ce que l'assistance renvoie. */
function nettoyer(brut: Partial<FicheProposee>[]): AnalyseClients {
  const avertissements: string[] = [];
  const fiches: FicheProposee[] = [];

  for (const f of brut.slice(0, 200)) {
    const nom = propre(f.nom, 120);
    if (!nom) continue;

    const email = propre(f.email, 160);
    const telephone = propre(f.telephone, 40);
    const raisonSociale = propre(f.raison_sociale, 160);
    const siretBrut = propre(f.siret, 30)?.replace(/\D/g, '') ?? null;

    const type: 'particulier' | 'societe' =
      f.type === 'societe' || raisonSociale || siretBrut ? 'societe' : 'particulier';

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      avertissements.push(`« ${nom} » : adresse e-mail illisible, à corriger.`);
    }
    if (siretBrut && siretBrut.length !== 14) {
      avertissements.push(`« ${nom} » : le SIRET ne fait pas 14 chiffres.`);
    }
    if (!email && !telephone) {
      avertissements.push(`« ${nom} » : aucun moyen de contact, la fiche sera refusée.`);
    }
    if (type === 'societe' && !raisonSociale) {
      avertissements.push(`« ${nom} » : société sans raison sociale, la fiche sera refusée.`);
    }

    fiches.push({
      type,
      nom,
      raison_sociale: raisonSociale,
      siret: siretBrut,
      email,
      telephone,
      adresse: propre(f.adresse, 300),
      code_postal: propre(f.code_postal, 10),
      ville: propre(f.ville, 120),
    });
  }

  if (fiches.length === 0) {
    return { ok: false, erreur: 'Aucun client reconnu dans ce texte.' };
  }

  return { ok: true, fiches, avertissements };
}

/* ── Application ────────────────────────────────────────────────────────── */

export type ApplicationClients =
  | { ok: true; message: string }
  | { ok: false; erreur: string };

export async function creerClientsProposes(
  _precedent: ApplicationClients | null,
  form: FormData,
): Promise<ApplicationClients> {
  let brut: Partial<FicheProposee>[];
  try {
    brut = JSON.parse(String(form.get('fiches') ?? ''));
  } catch {
    return { ok: false, erreur: 'Proposition illisible. Relancez l’analyse.' };
  }

  const verifiee = nettoyer(brut);
  if (!verifiee.ok) return { ok: false, erreur: verifiee.erreur };

  const sanity = await serveur();

  // Les fiches déjà en base ne sont pas recréées. Le rapprochement se fait sur
  // l'e-mail, seul identifiant fiable ici : deux « Martin Dupont » peuvent
  // exister, deux fois la même adresse presque jamais.
  const { data: existantes } = await sanity
    .from('client')
    .select('email')
    .is('archive_le', null)
    .not('email', 'is', null);

  const connus = new Set(
    ((existantes ?? []) as { email: string }[]).map((c) => c.email.toLowerCase()),
  );

  const aEcrire = [];
  let refusees = 0;
  let deja = 0;

  for (const f of verifiee.fiches) {
    if (!f.email && !f.telephone) {
      refusees += 1;
      continue;
    }
    if (f.type === 'societe' && !f.raison_sociale) {
      refusees += 1;
      continue;
    }
    if (f.email && connus.has(f.email.toLowerCase())) {
      deja += 1;
      continue;
    }
    if (f.email) connus.add(f.email.toLowerCase());
    aEcrire.push({ ...f, siret: f.siret?.length === 14 ? f.siret : null, pays: 'France' });
  }

  if (aEcrire.length > 0) {
    const { error } = await sanity.from('client').insert(aEcrire);
    if (error) return { ok: false, erreur: error.message };
  }

  revalidatePath('/clients');
  revalidatePath('/contrats');

  const morceaux = [`${aEcrire.length} fiche${aEcrire.length > 1 ? 's' : ''} créée${aEcrire.length > 1 ? 's' : ''}`];
  if (deja) morceaux.push(`${deja} déjà connue${deja > 1 ? 's' : ''}`);
  if (refusees) morceaux.push(`${refusees} incomplète${refusees > 1 ? 's' : ''}, non créée${refusees > 1 ? 's' : ''}`);

  return { ok: true, message: `${morceaux.join(', ')}.` };
}
