'use server';

/**
 * Création et archivage des clients.
 *
 * Un client ne se supprime jamais : il s'archive. Supprimer romprait le lien
 * avec ses contrats passés, et rendrait tout historique de loyer illisible.
 */
import { revalidatePath } from 'next/cache';
import { serveur } from '@/lib/supabase-serveur';
import type { Resultat } from '@/app/parametrage/actions';

const texte = (v: FormDataEntryValue | null, max = 200) => String(v ?? '').trim().slice(0, max);

export async function creerClient(_precedent: Resultat | null, form: FormData): Promise<Resultat> {
  const type = texte(form.get('type'), 20) === 'societe' ? 'societe' : 'particulier';
  const nom = texte(form.get('nom'), 120);
  const email = texte(form.get('email'), 160);
  const telephone = texte(form.get('telephone'), 40);

  if (!nom) return { ok: false, erreur: 'Le nom est obligatoire.' };
  if (!email && !telephone) {
    return { ok: false, erreur: 'Au moins un moyen de contact : e-mail ou téléphone.' };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, erreur: 'Adresse e-mail invalide.' };
  }

  const raisonSociale = texte(form.get('raison_sociale'), 160);
  const siret = texte(form.get('siret'), 20).replace(/\s/g, '');

  if (type === 'societe' && !raisonSociale) {
    return { ok: false, erreur: 'Une société doit porter une raison sociale.' };
  }
  if (siret && !/^\d{14}$/.test(siret)) {
    return { ok: false, erreur: 'Un SIRET compte exactement 14 chiffres.' };
  }

  const client = await serveur();
  const { error } = await client.from('client').insert({
    type,
    nom,
    raison_sociale: raisonSociale || null,
    siret: siret || null,
    email: email || null,
    telephone: telephone || null,
    adresse: texte(form.get('adresse'), 300) || null,
    code_postal: texte(form.get('code_postal'), 10) || null,
    ville: texte(form.get('ville'), 120) || null,
    note: texte(form.get('note'), 500) || null,
  });

  if (error) return { ok: false, erreur: error.message };

  revalidatePath('/clients');
  revalidatePath('/contrats');
  return {
    ok: true,
    message:
      type === 'societe'
        ? `Société « ${raisonSociale} » créée. Sa facturation relèvera de l’obligation de 2027.`
        : `Client « ${nom} » créé.`,
  };
}

export async function archiverClient(
  _precedent: Resultat | null,
  form: FormData,
): Promise<Resultat> {
  const id = texte(form.get('client_id'), 40);
  if (!id) return { ok: false, erreur: 'Client introuvable.' };

  const client = await serveur();

  // Un client qui loue encore ne s'archive pas : on perdrait de vue un contrat
  // en cours, et le box resterait occupé sans titulaire visible.
  const { count } = await client
    .from('contrat')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', id)
    .eq('statut', 'actif');

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      erreur: 'Ce client a encore un contrat actif. Enregistrez d’abord sa sortie.',
    };
  }

  const { error } = await client
    .from('client')
    .update({ archive_le: new Date().toISOString() })
    .eq('id', id);

  if (error) return { ok: false, erreur: error.message };

  revalidatePath('/clients');
  return { ok: true, message: 'Client archivé. Ses contrats passés restent consultables.' };
}
