/**
 * Loyers dus : ce qui est encaissé, ce qui est en attente, ce qui est en
 * retard.
 *
 * Une échéance est un loyer interne, pas une facture au sens légal : elle ne
 * porte aucune numérotation fiscale et n'engage rien vis-à-vis de
 * l'administration. La facturation reste à trancher.
 */
import Link from 'next/link';
import { serveur } from '@/lib/supabase-serveur';
import Cadre from '@/composants/Cadre';
import {
  AnnulerEcheance,
  EncaisserEcheance,
  GenererEcheances,
  LancerRelances,
} from '@/composants/ActionsEcheance';
import { genererEcheances } from './actions';
import { lancerRelances } from './relance';
import { DELAI_DE_GRACE } from '@/lib/relances';
import { dateFr, euros } from '@/lib/charte';
import { aujourdhuiIso, libellePeriode } from '@/lib/echeances';

export const dynamic = 'force-dynamic';

type Echeance = {
  id: string;
  periode_debut: string;
  periode_fin: string;
  montant_cents: number;
  jours_factures: number;
  jours_periode: number;
  statut: string;
  relance_envoyee_le: string | null;
  paye_le: string | null;
  moyen_paiement: string | null;
  note: string | null;
  contrat: {
    reference: string;
    client: { nom: string; raison_sociale: string | null; type: string } | null;
    box: { code: string } | null;
  } | null;
};

export default async function Echeances() {
  const sanity = await serveur();

  const { data } = await sanity
    .from('echeance')
    .select(
      'id, periode_debut, periode_fin, montant_cents, jours_factures, jours_periode, statut, relance_envoyee_le, paye_le, moyen_paiement, note, contrat(reference, client(nom, raison_sociale, type), box(code))',
    )
    .order('periode_debut', { ascending: false });

  const echeances = (data ?? []) as unknown as Echeance[];
  const aujourdhui = aujourdhuiIso();

  const dues = echeances.filter((e) => e.statut === 'due');
  const enRetard = dues.filter((e) => e.periode_fin < aujourdhui);
  const payees = echeances.filter((e) => e.statut === 'payee');
  const aRelancer = enRetard.filter((e) => !e.relance_envoyee_le);

  const somme = (liste: Echeance[]) => liste.reduce((n, e) => n + e.montant_cents, 0);

  return (
    <Cadre actif="/echeances">
      <div style={{ marginBottom: 26 }}>
        <h1 className="hero-titre" style={{ fontSize: 32 }}>
          Loyers dus
        </h1>
        <p className="hero-appui" style={{ maxWidth: '68ch' }}>
          Le loyer est dû d’avance : le mois en cours est émis en entier dès son premier jour, au
          prorata seulement si le contrat commence ou se termine dedans. Ce sont des loyers
          internes, <strong>pas des factures</strong> au sens légal.
        </p>
      </div>

      <div className="grille-hero" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
        <Chiffre
          valeur={euros(somme(enRetard))}
          libelle={`En retard · ${enRetard.length}`}
          icone="ph-warning-circle"
          alerte={enRetard.length > 0}
        />
        <Chiffre
          valeur={euros(somme(dues) - somme(enRetard))}
          libelle={`À échoir · ${dues.length - enRetard.length}`}
          icone="ph-hourglass-medium"
        />
        <Chiffre valeur={euros(somme(payees))} libelle={`Encaissé · ${payees.length}`} icone="ph-check-circle" />
        <Chiffre valeur={String(echeances.length)} libelle="Loyers au total" icone="ph-receipt" />
      </div>

      <section className="carte" style={{ marginTop: 22, marginBottom: 22 }}>
        <div className="entete-carte">
          <span>
            <h2 className="section-titre">Générer les loyers</h2>
            <p className="section-note">
              Calcule ce qui manque pour tous les contrats, jusqu’à la fin du mois en cours.
              Relancer deux fois ne crée rien en double.
            </p>
          </span>
        </div>
        <div style={{ marginTop: 18, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <GenererEcheances action={genererEcheances} />
          <LancerRelances action={lancerRelances} nombreEnRetard={aRelancer.length} />
        </div>
        <p className="aide" style={{ marginTop: 14 }}>
          Une relance part {DELAI_DE_GRACE} jours après la fin de période, une seule fois par
          loyer. {aRelancer.length === 0
            ? 'Aucun loyer n’est éligible pour l’instant.'
            : `${aRelancer.length} loyer${aRelancer.length > 1 ? 's' : ''} éligible${aRelancer.length > 1 ? 's' : ''}.`}
        </p>
      </section>

      <section className="carte">
        <div className="entete-carte">
          <h2 className="section-titre">Tous les loyers</h2>
          <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {enRetard.length > 0 && (
              <span className="etiq etiq-corail">{enRetard.length} en retard</span>
            )}
            <span className="etiq etiq-douce">{dues.length} dus</span>
            <span className="etiq etiq-verte">{payees.length} encaissés</span>
          </span>
        </div>

        {echeances.length === 0 ? (
          <p className="aide" style={{ marginTop: 16, fontStyle: 'italic' }}>
            Aucun loyer calculé. Créez d’abord un{' '}
            <Link href="/contrats">contrat</Link>, puis lancez la génération.
          </p>
        ) : (
          <div className="tableau-cadre">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Période</th>
                  <th>Client</th>
                  <th>Box</th>
                  <th>Détail</th>
                  <th>Montant</th>
                  <th>État</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {echeances.map((e) => {
                  const client = e.contrat?.client;
                  const nom =
                    client?.type === 'societe' ? (client?.raison_sociale ?? client?.nom) : client?.nom;
                  const retard = e.statut === 'due' && e.periode_fin < aujourdhui;
                  const prorata = e.jours_factures !== e.jours_periode;

                  return (
                    <tr key={e.id} className={e.statut === 'annulee' ? 'ligne-close' : undefined}>
                      <td className="cellule-forte">
                        {libellePeriode(e.periode_debut, e.periode_fin, e.jours_periode)}
                      </td>
                      <td>{nom ?? '—'}</td>
                      <td>
                        <span className="etiq etiq-douce" style={{ fontSize: 11 }}>
                          {e.contrat?.box?.code ?? '—'}
                        </span>
                      </td>
                      <td>
                        {prorata ? (
                          <>
                            <span className="etiq etiq-ambre" style={{ fontSize: 10.5 }}>
                              prorata
                            </span>{' '}
                            <span className="ligne-detail">
                              {e.jours_factures} j sur {e.jours_periode}
                            </span>
                          </>
                        ) : (
                          <span className="ligne-detail">mois entier</span>
                        )}
                        {e.note && (
                          <span className="ligne-detail" style={{ display: 'block' }}>
                            {e.note}
                          </span>
                        )}
                      </td>
                      <td className="cellule-forte">{euros(e.montant_cents)}</td>
                      <td>
                        {e.statut === 'payee' ? (
                          <>
                            <span className="etiq etiq-verte">Encaissé</span>
                            <span className="ligne-detail" style={{ display: 'block' }}>
                              {dateFr(e.paye_le)}
                              {e.moyen_paiement && ` · ${e.moyen_paiement}`}
                            </span>
                          </>
                        ) : e.statut === 'annulee' ? (
                          <span className="etiq etiq-douce">Annulé</span>
                        ) : retard ? (
                          <>
                            <span className="etiq etiq-corail">En retard</span>
                            {e.relance_envoyee_le && (
                              <span className="ligne-detail" style={{ display: 'block' }}>
                                relancé le {dateFr(e.relance_envoyee_le)}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="etiq etiq-douce">À échoir</span>
                        )}
                      </td>
                      <td>
                        {e.statut === 'due' && (
                          <span
                            style={{
                              display: 'flex',
                              gap: 10,
                              alignItems: 'center',
                              flexWrap: 'wrap',
                            }}
                          >
                            <EncaisserEcheance echeanceId={e.id} />
                            <AnnulerEcheance echeanceId={e.id} />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Cadre>
  );
}

function Chiffre({
  valeur,
  libelle,
  icone,
  alerte,
}: {
  valeur: string;
  libelle: string;
  icone: string;
  alerte?: boolean;
}) {
  return (
    <div className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span
        style={{
          width: 38,
          height: 38,
          borderRadius: 13,
          background: alerte ? 'var(--corail-fond)' : 'var(--creme)',
          color: alerte ? 'var(--corail-texte)' : 'var(--marine)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 19,
        }}
      >
        <i className={`ph-duotone ${icone}`} aria-hidden="true" />
      </span>
      <span style={{ marginTop: 'auto' }}>
        <span
          className="stat-valeur"
          style={{ display: 'block', color: alerte ? 'var(--corail-texte)' : undefined }}
        >
          {valeur}
        </span>
        <span className="stat-libelle" style={{ display: 'block' }}>
          {libelle}
        </span>
      </span>
    </div>
  );
}
