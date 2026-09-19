'use server';

/**
 * Contrats de location : entrée d'un client dans un box, et sortie.
 *
 * Deux règles sont tenues par la base, pas par ce fichier :
 *   - un box ne peut pas être loué deux fois sur des périodes qui se
 *     chevauchent (contrainte d'exclusion) ;
 *   - le journal des mouvements ne se modifie pas (déclencheur).
 * Ici on se contente de traduire ses refus en phrases lisibles, et de tenir
 * le statut du box en cohérence avec ses contrats.
 */
import { revalidatePath } from 'next/cache';
import { serveur } from '@/lib/supabase-serveur';
import type { Resultat } from '@/app/parametrage/actions';
import { versCentimes } from '@/lib/charte';

const texte = (v: FormDataEntryValue | null, max = 200) => String(v ?? '').trim().slice(0, max);

function rafraichir() {
  revalidatePath('/contrats');
  revalidatePath('/clients');
  revalidatePath('/');
}

/** Référence lisible et unique : BOX-2026-0001. */
async function genererReference(client: Awaited<ReturnType<typeof serveur>>): Promise<string> {
  const annee = new Date().getFullYear();
  for (let essai = 0; essai < 8; essai += 1) {
    const reference = `BOX-${annee}-${String(1000 + Math.floor(Math.random() * 9000))}`;
    const { count } = await client
      .from('contrat')
      .select('id', { count: 'exact', head: true })
      .eq('reference', reference);
    if (!count) return reference;
  }
  return `BOX-${annee}-${Date.now() % 100000}`;
}

export async function creerContrat(_precedent: Resultat | null, form: FormData): Promise<Resultat> {
  const client_id = texte(form.get('client_id'), 40);
  const box_id = texte(form.get('box_id'), 40);
  const debut = texte(form.get('debut'), 10);
  const loyer = versCentimes(texte(form.get('loyer'), 20));
  const depotSaisi = texte(form.get('depot'), 20);
  const depot = depotSaisi ? versCentimes(depotSaisi) : 0;
  const preavis = Number(form.get('preavis_jours'));

  if (!client_id) return { ok: false, erreur: 'Choisir un client.' };
  if (!box_id) return { ok: false, erreur: 'Choisir un box.' };
  if (!debut) return { ok: false, erreur: 'Indiquer la date d’entrée.' };
  if (loyer === null) {
    return { ok: false, erreur: 'Loyer invalide. Exemples acceptés : 79 ou 79,50.' };
  }
  if (depot === null) return { ok: false, erreur: 'Dépôt de garantie invalide.' };
  if (!Number.isInteger(preavis) || preavis < 0 || preavis > 365) {
    return { ok: false, erreur: 'Préavis invalide : un nombre de jours entre 0 et 365.' };
  }

  const sanity = await serveur();

  const { data: box } = await sanity
    .from('box')
    .select('id, code, statut')
    .eq('id', box_id)
    .maybeSingle();

  if (!box) return { ok: false, erreur: 'Box introuvable.' };
  if (box.statut === 'maintenance' || box.statut === 'retire') {
    return {
      ok: false,
      erreur: `Le box ${box.code} est en ${box.statut === 'retire' ? 'retrait' : 'maintenance'} : il n’est pas louable.`,
    };
  }

  const reference = await genererReference(sanity);

  const { data: cree, error } = await sanity
    .from('contrat')
    .insert({
      reference,
      client_id,
      box_id,
      debut,
      preavis_jours: preavis,
      loyer_mensuel_cents: loyer,
      depot_garantie_cents: depot,
      statut: 'actif',
      note: texte(form.get('note'), 500) || null,
    })
    .select('id')
    .single();

  if (error) {
    // 23P01 = violation de contrainte d'exclusion : la base refuse deux
    // locations qui se chevauchent sur le même box. C'est exactement ce qu'on
    // lui demande de faire, on le dit en français.
    if (error.code === '23P01') {
      return {
        ok: false,
        erreur: `Le box ${box.code} est déjà loué sur cette période. Aucun contrat n’a été créé.`,
      };
    }
    return { ok: false, erreur: error.message };
  }

  await sanity.from('box').update({ statut: 'occupe' }).eq('id', box_id);

  await sanity.from('mouvement').insert({
    type: 'entree',
    box_id,
    contrat_id: cree.id,
    client_id,
    detail: `Entrée dans le box ${box.code} — contrat ${reference}`,
  });

  rafraichir();
  return { ok: true, message: `Contrat ${reference} créé. Le box ${box.code} passe en occupé.` };
}

export async function enregistrerSortie(
  _precedent: Resultat | null,
  form: FormData,
): Promise<Resultat> {
  const contrat_id = texte(form.get('contrat_id'), 40);
  const fin = texte(form.get('fin_effective'), 10);
  if (!contrat_id) return { ok: false, erreur: 'Contrat introuvable.' };
  if (!fin) return { ok: false, erreur: 'Indiquer la date de sortie.' };

  const sanity = await serveur();

  const { data: contrat } = await sanity
    .from('contrat')
    .select('id, reference, debut, box_id, client_id, statut')
    .eq('id', contrat_id)
    .maybeSingle();

  if (!contrat) return { ok: false, erreur: 'Contrat introuvable.' };
  if (contrat.statut !== 'actif') {
    return { ok: false, erreur: 'Ce contrat est déjà clos.' };
  }
  if (fin < contrat.debut) {
    return { ok: false, erreur: 'La sortie ne peut pas précéder l’entrée.' };
  }

  const { error } = await sanity
    .from('contrat')
    .update({ fin_effective: fin, statut: 'termine' })
    .eq('id', contrat_id);

  if (error) return { ok: false, erreur: error.message };

  const { data: box } = await sanity
    .from('box')
    .select('code')
    .eq('id', contrat.box_id)
    .maybeSingle();

  // Le box redevient disponible — sauf s'il avait été mis en maintenance
  // entre-temps, auquel cas on ne défait pas cette décision.
  await sanity.from('box').update({ statut: 'disponible' }).eq('id', contrat.box_id).eq('statut', 'occupe');

  await sanity.from('mouvement').insert({
    type: 'sortie',
    box_id: contrat.box_id,
    contrat_id: contrat.id,
    client_id: contrat.client_id,
    detail: `Sortie du box ${box?.code ?? '?'} — contrat ${contrat.reference}`,
  });

  rafraichir();
  return {
    ok: true,
    message: `Sortie enregistrée. Le box ${box?.code ?? ''} redevient disponible.`,
  };
}
