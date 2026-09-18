'use server';

/**
 * Écritures du paramétrage : sites, catégories, tarifs, box.
 *
 * Toute la validation est ici, côté serveur, jamais seulement dans le
 * formulaire : un champ HTML `required` se contourne en trois secondes.
 * Les contraintes vraiment structurantes (unicité d'un code de box, absence de
 * chevauchement de contrats) sont tenues par la base elle-même — ce fichier se
 * contente de traduire ses refus en phrases lisibles.
 */
import { revalidatePath } from 'next/cache';
import { serveur } from '@/lib/supabase-serveur';
import { versCentimes } from '@/lib/charte';

export type Resultat = { ok: true; message: string } | { ok: false; erreur: string };

const texte = (v: FormDataEntryValue | null, max = 200) => String(v ?? '').trim().slice(0, max);

function nombreOuNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? '').trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function creerSite(_precedent: Resultat | null, form: FormData): Promise<Resultat> {
  const nom = texte(form.get('nom'), 120);
  const adresse = texte(form.get('adresse'), 300);
  if (!nom || !adresse) return { ok: false, erreur: 'Le nom et l’adresse sont obligatoires.' };

  const client = await serveur();
  const { error } = await client.from('site').insert({
    nom,
    adresse,
    code_postal: texte(form.get('code_postal'), 10) || null,
    ville: texte(form.get('ville'), 120) || null,
    horaires: texte(form.get('horaires'), 200) || null,
  });

  if (error) return { ok: false, erreur: error.message };
  revalidatePath('/parametrage');
  revalidatePath('/');
  return { ok: true, message: `Site « ${nom} » créé.` };
}

export async function creerCategorie(
  _precedent: Resultat | null,
  form: FormData,
): Promise<Resultat> {
  const nom = texte(form.get('nom'), 60);
  if (!nom) return { ok: false, erreur: 'Le nom de la catégorie est obligatoire.' };

  const surface = nombreOuNull(form.get('surface_m2'));
  const volume = nombreOuNull(form.get('volume_m3'));

  const client = await serveur();
  const { error } = await client.from('categorie_box').insert({
    nom,
    surface_m2: surface,
    volume_m3: volume,
    description: texte(form.get('description'), 200) || null,
  });

  if (error) return { ok: false, erreur: error.message };
  revalidatePath('/parametrage');
  return { ok: true, message: `Catégorie « ${nom} » créée.` };
}

export async function creerTarif(_precedent: Resultat | null, form: FormData): Promise<Resultat> {
  const categorie_id = texte(form.get('categorie_id'), 40);
  const montant = versCentimes(texte(form.get('montant'), 20));
  const applicable_du = texte(form.get('applicable_du'), 10);

  if (!categorie_id) return { ok: false, erreur: 'Choisir une catégorie.' };
  if (montant === null) {
    return { ok: false, erreur: 'Montant invalide. Exemples acceptés : 89 ou 89,50.' };
  }
  if (!applicable_du) return { ok: false, erreur: 'Indiquer la date d’entrée en vigueur.' };

  const client = await serveur();

  // Un tarif ne s'écrase pas : on ferme le précédent la veille du nouveau, et
  // on ajoute une ligne. Sans cela, un contrat ancien devient irrelisable.
  const veille = new Date(applicable_du);
  veille.setDate(veille.getDate() - 1);
  const veilleIso = veille.toISOString().slice(0, 10);

  await client
    .from('tarif')
    .update({ applicable_au: veilleIso })
    .eq('categorie_id', categorie_id)
    .is('applicable_au', null)
    .lt('applicable_du', applicable_du);

  const { error } = await client.from('tarif').insert({
    categorie_id,
    montant_mensuel_cents: montant,
    applicable_du,
  });

  if (error) return { ok: false, erreur: error.message };
  revalidatePath('/parametrage');
  return { ok: true, message: 'Tarif enregistré. Le précédent a été clôturé, pas effacé.' };
}

export async function creerBox(_precedent: Resultat | null, form: FormData): Promise<Resultat> {
  const site_id = texte(form.get('site_id'), 40);
  const categorie_id = texte(form.get('categorie_id'), 40);
  const prefixe = texte(form.get('prefixe'), 20);
  const etage = texte(form.get('etage'), 60) || null;
  const du = Number(form.get('du'));
  const au = Number(form.get('au'));

  if (!site_id || !categorie_id) return { ok: false, erreur: 'Choisir un site et une catégorie.' };
  if (!prefixe) return { ok: false, erreur: 'Indiquer le préfixe du code, par exemple « A- ».' };
  if (!Number.isInteger(du) || !Number.isInteger(au) || du < 0 || au < du) {
    return { ok: false, erreur: 'Plage de numéros invalide : le premier doit précéder le dernier.' };
  }
  if (au - du + 1 > 300) {
    return { ok: false, erreur: 'Plus de 300 box d’un coup : découper en plusieurs séries.' };
  }

  const largeur = String(au).length;
  const lignes = [];
  for (let n = du; n <= au; n += 1) {
    lignes.push({
      site_id,
      categorie_id,
      code: `${prefixe}${String(n).padStart(largeur, '0')}`,
      etage,
    });
  }

  const client = await serveur();
  const { error } = await client.from('box').insert(lignes);

  if (error) {
    // 23505 = violation d'unicité. La base garantit qu'un code de box est
    // unique par site ; on le dit en français plutôt qu'en code Postgres.
    if (error.code === '23505') {
      return {
        ok: false,
        erreur: 'Un de ces codes existe déjà sur ce site. Aucun box n’a été créé.',
      };
    }
    return { ok: false, erreur: error.message };
  }

  revalidatePath('/parametrage');
  revalidatePath('/');
  const premier = lignes[0]?.code ?? '';
  const dernier = lignes[lignes.length - 1]?.code ?? '';
  return {
    ok: true,
    message: `${lignes.length} box créé${lignes.length > 1 ? 's' : ''}, de ${premier} à ${dernier}.`,
  };
}
