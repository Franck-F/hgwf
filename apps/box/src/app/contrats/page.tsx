/**
 * Contrats de location : entrées, sorties, historique.
 *
 * Le loyer proposé vient du tarif en cours du gabarit, mais reste modifiable :
 * un geste commercial doit pouvoir être fait sans changer la grille tarifaire.
 */
import Link from 'next/link';
import { serveur } from '@/lib/supabase-serveur';
import Cadre from '@/composants/Cadre';
import FormulaireAction from '@/composants/FormulaireAction';
import SortieContrat from '@/composants/SortieContrat';
import { dateFr, euros } from '@/lib/charte';
import { creerContrat } from './actions';

export const dynamic = 'force-dynamic';

type BoxLibre = {
  id: string;
  code: string;
  categorie_id: string;
  site: { nom: string } | null;
  categorie_box: { nom: string } | null;
};

type ContratLigne = {
  id: string;
  reference: string;
  debut: string;
  fin_effective: string | null;
  preavis_jours: number;
  loyer_mensuel_cents: number;
  depot_garantie_cents: number;
  statut: string;
  client: { nom: string; raison_sociale: string | null; type: string } | null;
  box: { code: string } | null;
};

export default async function Contrats() {
  const sanity = await serveur();

  const [{ data: clientsData }, { data: boxData }, { data: tarifData }, { data: contratsData }] =
    await Promise.all([
      sanity.from('client').select('id, nom, raison_sociale, type').is('archive_le', null).order('nom'),
      sanity
        .from('box')
        .select('id, code, categorie_id, site(nom), categorie_box(nom)')
        .is('archive_le', null)
        .eq('statut', 'disponible')
        .order('code'),
      sanity
        .from('tarif')
        .select('categorie_id, montant_mensuel_cents, applicable_du')
        .is('applicable_au', null)
        .order('applicable_du', { ascending: false }),
      sanity
        .from('contrat')
        .select(
          'id, reference, debut, fin_effective, preavis_jours, loyer_mensuel_cents, depot_garantie_cents, statut, client(nom, raison_sociale, type), box(code)',
        )
        .order('debut', { ascending: false }),
    ]);

  const clients = (clientsData ?? []) as {
    id: string;
    nom: string;
    raison_sociale: string | null;
    type: string;
  }[];
  const boxLibres = (boxData ?? []) as unknown as BoxLibre[];
  const contrats = (contratsData ?? []) as unknown as ContratLigne[];

  const tarifParCategorie = new Map<string, number>();
  for (const t of (tarifData ?? []) as { categorie_id: string; montant_mensuel_cents: number }[]) {
    if (!tarifParCategorie.has(t.categorie_id)) {
      tarifParCategorie.set(t.categorie_id, t.montant_mensuel_cents);
    }
  }

  const actifs = contrats.filter((c) => c.statut === 'actif');
  const loyerTotal = actifs.reduce((n, c) => n + c.loyer_mensuel_cents, 0);
  const depotsDetenus = actifs.reduce((n, c) => n + c.depot_garantie_cents, 0);
  const aujourdhui = new Date().toISOString().slice(0, 10);

  const optionsClients = clients.map((c) => ({
    valeur: c.id,
    libelle: c.type === 'societe' ? (c.raison_sociale ?? c.nom) : c.nom,
  }));

  // Le libellé du box porte son tarif : sans lui, il faut retourner au
  // paramétrage pour savoir quel loyer saisir.
  const optionsBox = boxLibres.map((b) => {
    const prix = tarifParCategorie.get(b.categorie_id);
    const morceaux = [b.code, b.categorie_box?.nom, prix !== undefined ? euros(prix) : 'sans tarif'];
    return { valeur: b.id, libelle: morceaux.filter(Boolean).join(' · ') };
  });

  const manqueQuelqueChose = clients.length === 0 || boxLibres.length === 0;

  return (
    <Cadre actif="/contrats">
      <div style={{ marginBottom: 26 }}>
        <h1 className="hero-titre" style={{ fontSize: 32 }}>
          Contrats
        </h1>
        <p className="hero-appui" style={{ maxWidth: '68ch' }}>
          {actifs.length} contrat{actifs.length > 1 ? 's' : ''} en cours pour{' '}
          <strong>{euros(loyerTotal)}</strong> de loyer mensuel.
          {depotsDetenus > 0 && <> {euros(depotsDetenus)} de dépôts de garantie détenus.</>}
        </p>
      </div>

      <section className="carte" style={{ marginBottom: 22 }}>
        <h2 className="section-titre">Nouvelle entrée</h2>
        <p className="section-note">
          Seuls les box disponibles apparaissent. Le loyer proposé est celui du gabarit — modifiez-le
          pour un geste commercial, la grille tarifaire ne bouge pas.
        </p>

        <div style={{ marginTop: 20 }}>
          {manqueQuelqueChose ? (
            <p className="aide" style={{ margin: 0, fontStyle: 'italic' }}>
              {clients.length === 0 ? (
                <>
                  Créez d’abord un client depuis la page{' '}
                  <Link href="/clients">Clients</Link>.
                </>
              ) : (
                <>
                  Aucun box disponible. Ajoutez-en depuis le{' '}
                  <Link href="/parametrage">paramétrage</Link>, ou libérez-en un ci-dessous.
                </>
              )}
            </p>
          ) : (
            <FormulaireAction
              action={creerContrat}
              bouton="Enregistrer l’entrée"
              champs={[
                {
                  nom: 'client_id',
                  libelle: 'Client',
                  type: 'select',
                  obligatoire: true,
                  options: optionsClients,
                  colonnes: 2,
                },
                {
                  nom: 'box_id',
                  libelle: 'Box disponible',
                  type: 'select',
                  obligatoire: true,
                  options: optionsBox,
                  colonnes: 2,
                },
                {
                  nom: 'debut',
                  libelle: 'Date d’entrée',
                  type: 'date',
                  obligatoire: true,
                  defaut: aujourdhui,
                },
                {
                  nom: 'loyer',
                  libelle: 'Loyer mensuel (€)',
                  obligatoire: true,
                  aide: 'Repris du gabarit, modifiable',
                },
                { nom: 'depot', libelle: 'Dépôt de garantie (€)', aide: 'Laisser vide si aucun' },
                {
                  nom: 'preavis_jours',
                  libelle: 'Préavis (jours)',
                  type: 'number',
                  obligatoire: true,
                  defaut: '30',
                },
                { nom: 'note', libelle: 'Note interne', colonnes: 2 },
              ]}
            />
          )}
        </div>
      </section>

      <section className="carte">
        <div className="entete-carte">
          <h2 className="section-titre">Tous les contrats</h2>
          <span style={{ display: 'flex', gap: 8 }}>
            <span className="etiq etiq-verte">{actifs.length} en cours</span>
            <span className="etiq etiq-douce">{contrats.length - actifs.length} clos</span>
          </span>
        </div>

        {contrats.length === 0 ? (
          <p className="aide" style={{ marginTop: 16, fontStyle: 'italic' }}>
            Aucun contrat pour l’instant.
          </p>
        ) : (
          <div className="tableau-cadre">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Client</th>
                  <th>Box</th>
                  <th>Entrée</th>
                  <th>Sortie</th>
                  <th>Loyer</th>
                  <th>État</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {contrats.map((c) => {
                  const nom =
                    c.client?.type === 'societe'
                      ? (c.client?.raison_sociale ?? c.client?.nom)
                      : c.client?.nom;
                  return (
                    <tr key={c.id} className={c.statut !== 'actif' ? 'ligne-close' : undefined}>
                      <td className="cellule-forte">{c.reference}</td>
                      <td>{nom ?? '—'}</td>
                      <td>
                        <span className="etiq etiq-douce" style={{ fontSize: 11 }}>
                          {c.box?.code ?? '—'}
                        </span>
                      </td>
                      <td>{dateFr(c.debut)}</td>
                      <td>{c.fin_effective ? dateFr(c.fin_effective) : '—'}</td>
                      <td className="cellule-forte">{euros(c.loyer_mensuel_cents)}</td>
                      <td>
                        <span
                          className={`etiq ${c.statut === 'actif' ? 'etiq-verte' : 'etiq-douce'}`}
                        >
                          {c.statut === 'actif' ? 'En cours' : 'Clos'}
                        </span>
                      </td>
                      <td>
                        {c.statut === 'actif' && (
                          <SortieContrat
                            contratId={c.id}
                            reference={c.reference}
                            codeBox={c.box?.code ?? '?'}
                            debut={c.debut}
                          />
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
