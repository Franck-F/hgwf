import 'server-only';

/**
 * Relance des loyers en retard.
 *
 * Partagée entre le bouton de l'écran et la route appelée par une tâche
 * planifiée : le même code, donc les mêmes garde-fous dans les deux cas. Un
 * envoi déclenché à la main et un envoi automatique qui divergent, c'est deux
 * comportements à vérifier au lieu d'un.
 *
 * Quatre règles, dans cet ordre :
 *   1. une seule relance par loyer, jamais deux ;
 *   2. uniquement les loyers encore dus — un loyer encaissé ou annulé ne
 *      relance personne ;
 *   3. uniquement passé la date d'échéance, avec un délai de grâce ;
 *   4. l'horodatage est posé même si l'envoi échoue, sinon une adresse qui
 *      rejette nos messages serait relancée tous les jours.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { envoiConfigure, envoyerEmail, gabaritHtml } from './email';
import { aujourdhuiIso, libellePeriode } from './echeances';

/** Jours de grâce après la fin de période avant qu'une relance parte. */
export const DELAI_DE_GRACE = 5;

export type Bilan = {
  ok: boolean;
  envoyees: number;
  echecs: number;
  sansAdresse: number;
  message: string;
};

type Ligne = {
  id: string;
  periode_debut: string;
  periode_fin: string;
  montant_cents: number;
  jours_periode: number;
  contrat: {
    reference: string;
    box: { code: string } | null;
    client: { nom: string; raison_sociale: string | null; type: string; email: string | null } | null;
  } | null;
};

function limiteIso(jours: number): string {
  const d = new Date();
  d.setDate(d.getDate() - jours);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function relancerImpayes(sanity: SupabaseClient): Promise<Bilan> {
  if (!envoiConfigure()) {
    return {
      ok: false,
      envoyees: 0,
      echecs: 0,
      sansAdresse: 0,
      message: 'Envoi d’e-mails non configuré sur ce serveur.',
    };
  }

  const { data, error } = await sanity
    .from('echeance')
    .select(
      'id, periode_debut, periode_fin, montant_cents, jours_periode, contrat(reference, box(code), client(nom, raison_sociale, type, email))',
    )
    .eq('statut', 'due')
    .is('relance_envoyee_le', null)
    .lt('periode_fin', limiteIso(DELAI_DE_GRACE))
    .order('periode_debut')
    .limit(50);

  if (error) {
    return { ok: false, envoyees: 0, echecs: 0, sansAdresse: 0, message: error.message };
  }

  const lignes = (data ?? []) as unknown as Ligne[];
  if (lignes.length === 0) {
    return {
      ok: true,
      envoyees: 0,
      echecs: 0,
      sansAdresse: 0,
      message: 'Aucun loyer à relancer.',
    };
  }

  let envoyees = 0;
  let echecs = 0;
  let sansAdresse = 0;

  for (const e of lignes) {
    const client = e.contrat?.client;

    // Le test porte sur `client?.email` et non sur une variable dérivée : c'est
    // ce qui permet au compilateur de savoir, ensuite, que la fiche existe.
    if (!client?.email?.trim()) {
      sansAdresse += 1;
      continue;
    }

    const adresse = client.email.trim();
    const nom = client.type === 'societe' ? (client.raison_sociale ?? client.nom) : client.nom;
    const periode = libellePeriode(e.periode_debut, e.periode_fin, e.jours_periode);
    const montant = (e.montant_cents / 100).toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    });
    const box = e.contrat?.box?.code ?? '';

    // Texte volontairement procédural : une échéance qui est passée, pas une
    // offre. C'est ce qui le maintient du côté transactionnel.
    const paragraphes = [
      `Bonjour ${nom},`,
      `Le loyer de votre box ${box} pour la période ${periode} n’apparaît pas encore comme réglé dans nos comptes.`,
      'Si le règlement est parti entre-temps, ce message n’appelle aucune action de votre part.',
      'Dans le cas contraire, vous pouvez nous joindre pour convenir des modalités.',
    ];

    const lignesTableau: [string, string][] = [
      ['Box', box],
      ['Période', periode],
      ['Montant', montant],
      ['Contrat', e.contrat?.reference ?? ''],
    ];

    const resultat = await envoyerEmail({
      to: adresse,
      subject: `Loyer en attente — box ${box} · ${periode}`,
      text:
        paragraphes.join('\n\n') +
        '\n\n' +
        lignesTableau.map(([c, v]) => `${c} : ${v}`).join('\n') +
        '\n\nHGWF Cargo · contact@hgwf-cargo.fr · 09 62 03 80 13',
      html: gabaritHtml({ titre: 'Loyer en attente', paragraphes, lignes: lignesTableau }),
    });

    if (resultat.ok) envoyees += 1;
    else echecs += 1;

    // Posé dans les deux cas. Une adresse qui rejette nos messages ne doit pas
    // être relancée tous les jours : c'est ainsi qu'on finit en liste noire.
    await sanity
      .from('echeance')
      .update({ relance_envoyee_le: new Date().toISOString(), relance_envoyee_a: adresse })
      .eq('id', e.id);
  }

  const morceaux: string[] = [];
  if (envoyees) morceaux.push(`${envoyees} relance${envoyees > 1 ? 's' : ''} envoyée${envoyees > 1 ? 's' : ''}`);
  if (echecs) morceaux.push(`${echecs} échec${echecs > 1 ? 's' : ''}`);
  if (sansAdresse) morceaux.push(`${sansAdresse} sans adresse e-mail`);

  return {
    ok: true,
    envoyees,
    echecs,
    sansAdresse,
    message: morceaux.length ? `${morceaux.join(', ')}.` : 'Aucun loyer à relancer.',
  };
}

export { aujourdhuiIso };
