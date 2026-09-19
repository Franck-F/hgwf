/**
 * Fiches clients.
 *
 * Le type — particulier ou société — n'est pas cosmétique : une société
 * déclenche l'obligation de facturation électronique au 1er septembre 2027,
 * un particulier non. L'écran le rappelle là où la décision se prend.
 */
import { serveur } from '@/lib/supabase-serveur';
import Cadre from '@/composants/Cadre';
import FormulaireAction from '@/composants/FormulaireAction';
import { dateFr, euros } from '@/lib/charte';
import { creerClient } from './actions';

export const dynamic = 'force-dynamic';

type Client = {
  id: string;
  type: string;
  nom: string;
  raison_sociale: string | null;
  email: string | null;
  telephone: string | null;
  ville: string | null;
  cree_le: string;
};

type Contrat = {
  client_id: string;
  statut: string;
  loyer_mensuel_cents: number;
  box: { code: string } | null;
};

export default async function Clients() {
  const sanity = await serveur();

  const [{ data: clientsData }, { data: contratsData }] = await Promise.all([
    sanity
      .from('client')
      .select('id, type, nom, raison_sociale, email, telephone, ville, cree_le')
      .is('archive_le', null)
      .order('nom'),
    sanity.from('contrat').select('client_id, statut, loyer_mensuel_cents, box(code)'),
  ]);

  const clients = (clientsData ?? []) as Client[];
  const contrats = (contratsData ?? []) as unknown as Contrat[];

  const parClient = new Map<string, { actifs: Contrat[]; passes: number }>();
  for (const c of contrats) {
    const entree = parClient.get(c.client_id) ?? { actifs: [], passes: 0 };
    if (c.statut === 'actif') entree.actifs.push(c);
    else entree.passes += 1;
    parClient.set(c.client_id, entree);
  }

  const societes = clients.filter((c) => c.type === 'societe').length;
  const avecContrat = clients.filter((c) => (parClient.get(c.id)?.actifs.length ?? 0) > 0).length;

  return (
    <Cadre actif="/clients">
      <div style={{ marginBottom: 26 }}>
        <h1 className="hero-titre" style={{ fontSize: 32 }}>
          Clients
        </h1>
        <p className="hero-appui" style={{ maxWidth: '68ch' }}>
          {clients.length} fiche{clients.length > 1 ? 's' : ''}, dont {avecContrat} avec un contrat
          en cours et {societes} société{societes > 1 ? 's' : ''}. Un client ne se supprime pas : il
          s’archive, pour que ses contrats passés restent lisibles.
        </p>
      </div>

      <section className="carte" style={{ marginBottom: 22 }}>
        <h2 className="section-titre">Nouveau client</h2>
        <p className="section-note">
          Une société doit porter une raison sociale. Son SIRET n’est pas obligatoire ici, mais il
          le deviendra pour facturer.
        </p>

        <div style={{ marginTop: 20 }}>
          <FormulaireAction
            action={creerClient}
            bouton="Créer la fiche"
            champs={[
              {
                nom: 'type',
                libelle: 'Type',
                type: 'select',
                obligatoire: true,
                options: [
                  { valeur: 'particulier', libelle: 'Particulier' },
                  { valeur: 'societe', libelle: 'Société' },
                ],
              },
              { nom: 'nom', libelle: 'Nom et prénom', obligatoire: true, colonnes: 2 },
              { nom: 'raison_sociale', libelle: 'Raison sociale', aide: 'Sociétés uniquement' },
              { nom: 'siret', libelle: 'SIRET', aide: '14 chiffres' },
              { nom: 'email', libelle: 'E-mail', colonnes: 2 },
              { nom: 'telephone', libelle: 'Téléphone' },
              {
                nom: 'adresse',
                libelle: 'Adresse',
                type: 'adresse',
                colonnes: 2,
                aide: 'Tapez le début, choisissez dans la liste.',
              },
              { nom: 'code_postal', libelle: 'Code postal' },
              { nom: 'ville', libelle: 'Ville' },
              { nom: 'note', libelle: 'Note interne', colonnes: 2, aide: 'Jamais visible du client.' },
            ]}
          />
        </div>
      </section>

      <section className="carte">
        <h2 className="section-titre">Fiches</h2>

        {clients.length === 0 ? (
          <p className="aide" style={{ marginTop: 14, fontStyle: 'italic' }}>
            Aucun client pour l’instant.
          </p>
        ) : (
          <div className="tableau-cadre">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Box loués</th>
                  <th>Loyer mensuel</th>
                  <th>Depuis</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const suivi = parClient.get(c.id);
                  const actifs = suivi?.actifs ?? [];
                  const loyer = actifs.reduce((n, a) => n + a.loyer_mensuel_cents, 0);
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className="cellule-forte">
                          {c.type === 'societe' ? (c.raison_sociale ?? c.nom) : c.nom}
                        </span>
                        {c.type === 'societe' && c.raison_sociale && (
                          <span className="ligne-detail" style={{ display: 'block' }}>
                            contact : {c.nom}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`etiq ${c.type === 'societe' ? 'etiq-rose' : 'etiq-douce'}`}>
                          {c.type === 'societe' ? 'Société' : 'Particulier'}
                        </span>
                      </td>
                      <td>
                        {c.email ?? '—'}
                        {c.telephone && (
                          <span className="ligne-detail" style={{ display: 'block' }}>
                            {c.telephone}
                          </span>
                        )}
                      </td>
                      <td>
                        {actifs.length === 0 ? (
                          <span className="ligne-close">aucun</span>
                        ) : (
                          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {actifs.map((a, i) => (
                              <span key={i} className="etiq etiq-encre" style={{ fontSize: 11 }}>
                                {a.box?.code ?? '?'}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="cellule-forte">{loyer > 0 ? euros(loyer) : '—'}</td>
                      <td className="ligne-close">{dateFr(c.cree_le)}</td>
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
