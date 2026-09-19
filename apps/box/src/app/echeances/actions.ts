'use server';

/**
 * Loyers dus : génération, encaissement, annulation.
 *
 * Le calcul lui-même vit dans `@/lib/echeances`, sans base ni horloge, pour
 * rester vérifiable à la main. Ici on ne fait que lire les contrats, écrire ce
 * qui manque, et traduire les refus de la base.
 */
import { revalidatePath } from 'next/cache';
import { serveur } from '@/lib/supabase-serveur';
import type { Resultat } from '@/app/parametrage/actions';
import { aujourdhuiIso, echeancesDuContrat, finDuMois } from '@/lib/echeances';

const texte = (v: FormDataEntryValue | null, max = 200) => String(v ?? '').trim().slice(0, max);

function rafraichir() {
  revalidatePath('/echeances');
  revalidatePath('/contrats');
  revalidatePath('/');
}

/**
 * Génère les loyers manquants de tous les contrats, jusqu'à la fin du mois en
 * cours. Le loyer est dû d'avance : le mois courant est émis en entier dès son
 * premier jour, prorata seulement si le contrat commence ou se termine dedans.
 *
 * Relancer la génération deux fois ne crée rien en double — l'index unique de
 * la base l'interdit, et on saute ce qui existe déjà avant même d'écrire.
 */
export async function genererEcheances(): Promise<Resultat> {
  const sanity = await serveur();
  const jusquA = finDuMois(aujourdhuiIso());

  const { data: contratsData, error: erreurLecture } = await sanity
    .from('contrat')
    .select('id, reference, debut, fin_effective, loyer_mensuel_cents');

  if (erreurLecture) return { ok: false, erreur: erreurLecture.message };

  const contrats = (contratsData ?? []) as {
    id: string;
    reference: string;
    debut: string;
    fin_effective: string | null;
    loyer_mensuel_cents: number;
  }[];

  if (contrats.length === 0) {
    return { ok: false, erreur: 'Aucun contrat : il n’y a aucun loyer à calculer.' };
  }

  const { data: dejaData } = await sanity
    .from('echeance')
    .select('contrat_id, periode_debut')
    .neq('statut', 'annulee');

  const deja = new Set(
    ((dejaData ?? []) as { contrat_id: string; periode_debut: string }[]).map(
      (e) => `${e.contrat_id}|${e.periode_debut}`,
    ),
  );

  const aEcrire = [];
  for (const c of contrats) {
    const calculees = echeancesDuContrat({
      debut: c.debut,
      fin: c.fin_effective,
      loyerMensuelCents: c.loyer_mensuel_cents,
      jusquA,
    });
    for (const e of calculees) {
      if (deja.has(`${c.id}|${e.periode_debut}`)) continue;
      aEcrire.push({ contrat_id: c.id, ...e });
    }
  }

  if (aEcrire.length === 0) {
    return { ok: true, message: 'Tout est déjà généré : aucun loyer ne manquait.' };
  }

  const { error } = await sanity.from('echeance').insert(aEcrire);
  if (error) return { ok: false, erreur: error.message };

  rafraichir();
  const total = aEcrire.reduce((n, e) => n + e.montant_cents, 0);
  return {
    ok: true,
    message: `${aEcrire.length} loyer${aEcrire.length > 1 ? 's' : ''} généré${aEcrire.length > 1 ? 's' : ''}, ${(total / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} au total.`,
  };
}

export async function marquerPayee(
  _precedent: Resultat | null,
  form: FormData,
): Promise<Resultat> {
  const id = texte(form.get('echeance_id'), 40);
  const paye_le = texte(form.get('paye_le'), 10) || aujourdhuiIso();
  const moyen = texte(form.get('moyen_paiement'), 40);

  if (!id) return { ok: false, erreur: 'Échéance introuvable.' };

  const sanity = await serveur();
  const { data: avant } = await sanity
    .from('echeance')
    .select('id, statut, contrat_id, montant_cents')
    .eq('id', id)
    .maybeSingle();

  if (!avant) return { ok: false, erreur: 'Échéance introuvable.' };
  if (avant.statut === 'payee') return { ok: false, erreur: 'Ce loyer est déjà encaissé.' };
  if (avant.statut === 'annulee') return { ok: false, erreur: 'Ce loyer a été annulé.' };

  const { error } = await sanity
    .from('echeance')
    .update({ statut: 'payee', paye_le, moyen_paiement: moyen || null })
    .eq('id', id);

  if (error) return { ok: false, erreur: error.message };

  await sanity.from('mouvement').insert({
    type: 'note',
    contrat_id: avant.contrat_id,
    detail: `Loyer encaissé : ${(avant.montant_cents / 100).toFixed(2)} €${moyen ? ` (${moyen})` : ''}`,
  });

  rafraichir();
  return { ok: true, message: 'Loyer marqué encaissé.' };
}

/**
 * Annule un loyer. Il n'est ni effacé ni corrigé : il reste, marqué annulé,
 * avec son motif. C'est ce qui permet de régénérer la période au prorata après
 * une sortie anticipée sans réécrire l'histoire.
 */
export async function annulerEcheance(
  _precedent: Resultat | null,
  form: FormData,
): Promise<Resultat> {
  const id = texte(form.get('echeance_id'), 40);
  const motif = texte(form.get('motif'), 200);

  if (!id) return { ok: false, erreur: 'Échéance introuvable.' };
  if (!motif) return { ok: false, erreur: 'Un motif écrit est obligatoire pour annuler.' };

  const sanity = await serveur();
  const { data: avant } = await sanity
    .from('echeance')
    .select('id, statut, contrat_id, montant_cents')
    .eq('id', id)
    .maybeSingle();

  if (!avant) return { ok: false, erreur: 'Échéance introuvable.' };
  if (avant.statut === 'annulee') return { ok: false, erreur: 'Ce loyer est déjà annulé.' };

  const { error } = await sanity
    .from('echeance')
    .update({ statut: 'annulee', note: motif })
    .eq('id', id);

  if (error) return { ok: false, erreur: error.message };

  await sanity.from('mouvement').insert({
    type: 'note',
    contrat_id: avant.contrat_id,
    detail: `Loyer annulé (${(avant.montant_cents / 100).toFixed(2)} €) : ${motif}`,
  });

  rafraichir();
  return {
    ok: true,
    message: 'Loyer annulé. La période peut être régénérée.',
  };
}
