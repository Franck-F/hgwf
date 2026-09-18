/**
 * Paramétrage : c'est ici que l'équipe déclare son parc elle-même — local,
 * gabarits, tarifs, box. Aucune de ces valeurs n'est écrite dans le code.
 *
 * L'ordre des sections suit les dépendances : un box a besoin d'un site et
 * d'une catégorie, une catégorie a besoin d'exister avant d'avoir un tarif.
 */
import { serveur } from '@/lib/supabase-serveur';
import Cadre from '@/composants/Cadre';
import FormulaireAction from '@/composants/FormulaireAction';
import AssistantParc from '@/composants/AssistantParc';
import { creerBox, creerCategorie, creerSite, creerTarif } from './actions';
import { dateFr, euros } from '@/lib/charte';
import { geminiConfigure } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

type Site = { id: string; nom: string; adresse: string; ville: string | null };
type Categorie = { id: string; nom: string; surface_m2: number | null; volume_m3: number | null };
type Tarif = {
  id: string;
  categorie_id: string;
  montant_mensuel_cents: number;
  applicable_du: string;
  applicable_au: string | null;
};
type BoxLigne = {
  id: string;
  code: string;
  etage: string | null;
  site_id: string;
  categorie_id: string;
};

export default async function Parametrage() {
  const client = await serveur();

  const [sites, categories, tarifs, box] = await Promise.all([
    client.from('site').select('id, nom, adresse, ville').is('archive_le', null).order('nom'),
    client
      .from('categorie_box')
      .select('id, nom, surface_m2, volume_m3')
      .is('archive_le', null)
      .order('surface_m2', { nullsFirst: false }),
    client
      .from('tarif')
      .select('id, categorie_id, montant_mensuel_cents, applicable_du, applicable_au')
      .order('applicable_du', { ascending: false }),
    client.from('box').select('id, code, etage, site_id, categorie_id').is('archive_le', null),
  ]);

  const lesSites = (sites.data ?? []) as Site[];
  const lesCategories = (categories.data ?? []) as Categorie[];
  const lesTarifs = (tarifs.data ?? []) as Tarif[];
  const lesBox = (box.data ?? []) as BoxLigne[];

  const optionsSites = lesSites.map((s) => ({ valeur: s.id, libelle: s.nom }));
  const optionsCategories = lesCategories.map((c) => ({ valeur: c.id, libelle: c.nom }));
  const aujourdhui = new Date().toISOString().slice(0, 10);

  // Tarif courant par catégorie : le plus récent encore ouvert.
  const tarifCourant = new Map<string, Tarif>();
  for (const t of lesTarifs) {
    if (!tarifCourant.has(t.categorie_id) && !t.applicable_au) tarifCourant.set(t.categorie_id, t);
  }

  const compteParCategorie = new Map<string, number>();
  for (const b of lesBox) {
    compteParCategorie.set(b.categorie_id, (compteParCategorie.get(b.categorie_id) ?? 0) + 1);
  }

  return (
    <Cadre
      actif="/parametrage"
      titre="Paramétrage du parc"
      chapeau="Le plus rapide : décrire le parc en une phrase. Sinon, remplissez les sections dans l’ordre — local, gabarits, tarifs, box."
    >
      <AssistantParc disponible={geminiConfigure()} />

      <Section numero="1" titre="Locaux" note="Un seul local aujourd’hui n’empêche pas d’en ouvrir un second : la structure le prévoit déjà.">
        <FormulaireAction
          action={creerSite}
          bouton="Ajouter le local"
          champs={[
            { nom: 'nom', libelle: 'Nom du local', obligatoire: true, colonnes: 2 },
            {
              nom: 'adresse',
              libelle: 'Adresse',
              type: 'adresse',
              obligatoire: true,
              colonnes: 2,
              aide: 'Tapez le début, choisissez dans la liste : code postal et ville se remplissent seuls.',
            },
            { nom: 'code_postal', libelle: 'Code postal' },
            { nom: 'ville', libelle: 'Ville' },
            {
              nom: 'horaires',
              libelle: 'Horaires d’accès',
              aide: 'Ex. : lundi au vendredi, 9h-18h',
              colonnes: 2,
            },
          ]}
        />

        {lesSites.length > 0 && (
          <Tableau entetes={['Nom', 'Adresse', 'Ville']}>
            {lesSites.map((s) => (
              <tr key={s.id}>
                <td className="cellule-forte">{s.nom}</td>
                <td>{s.adresse}</td>
                <td>{s.ville ?? '—'}</td>
              </tr>
            ))}
          </Tableau>
        )}
      </Section>

      <Section
        numero="2"
        titre="Gabarits de box"
        note="Une ligne par taille vendue. C’est le gabarit qui porte le tarif, jamais le box lui-même."
      >
        <FormulaireAction
          action={creerCategorie}
          bouton="Ajouter le gabarit"
          champs={[
            { nom: 'nom', libelle: 'Nom', obligatoire: true, aide: 'Ex. : 6 m²' },
            { nom: 'surface_m2', libelle: 'Surface (m²)', type: 'number', pas: '0.01' },
            { nom: 'volume_m3', libelle: 'Volume (m³)', type: 'number', pas: '0.01' },
            {
              nom: 'description',
              libelle: 'À quoi ça correspond',
              aide: 'Ex. : deux pièces',
              colonnes: 2,
            },
          ]}
        />

        {lesCategories.length > 0 && (
          <Tableau entetes={['Gabarit', 'Surface', 'Volume', 'Tarif en cours', 'Box déclarés']}>
            {lesCategories.map((c) => {
              const t = tarifCourant.get(c.id);
              return (
                <tr key={c.id}>
                  <td className="cellule-forte">{c.nom}</td>
                  <td>{c.surface_m2 ? `${c.surface_m2} m²` : '—'}</td>
                  <td>{c.volume_m3 ? `${c.volume_m3} m³` : '—'}</td>
                  <td>
                    {t ? (
                      <>
                        <span className="cellule-forte">{euros(t.montant_mensuel_cents)}</span>{' '}
                        <span className="ligne-close" style={{ fontSize: 12 }}>
                          depuis le {dateFr(t.applicable_du)}
                        </span>
                      </>
                    ) : (
                      <span className="ligne-close">aucun</span>
                    )}
                  </td>
                  <td>{compteParCategorie.get(c.id) ?? 0}</td>
                </tr>
              );
            })}
          </Tableau>
        )}
      </Section>

      <Section
        numero="3"
        titre="Tarifs mensuels"
        note="Un tarif ne s’écrase pas. Enregistrer un nouveau prix clôture le précédent la veille et le conserve : sans cela, un contrat signé l’an dernier deviendrait illisible."
      >
        {lesCategories.length === 0 ? (
          <Attente>Créez d’abord un gabarit de box.</Attente>
        ) : (
          <FormulaireAction
            action={creerTarif}
            bouton="Enregistrer le tarif"
            champs={[
              {
                nom: 'categorie_id',
                libelle: 'Gabarit',
                type: 'select',
                obligatoire: true,
                options: optionsCategories,
              },
              {
                nom: 'montant',
                libelle: 'Loyer mensuel (€)',
                obligatoire: true,
                aide: 'Ex. : 89 ou 89,50',
              },
              {
                nom: 'applicable_du',
                libelle: 'À partir du',
                type: 'date',
                obligatoire: true,
                defaut: aujourdhui,
              },
            ]}
          />
        )}

        {lesTarifs.length > 0 && (
          <Tableau entetes={['Gabarit', 'Montant', 'Du', 'Au']}>
            {lesTarifs.map((t) => (
              <tr key={t.id} className={t.applicable_au ? 'ligne-close' : undefined}>
                <td className="cellule-forte">
                  {lesCategories.find((c) => c.id === t.categorie_id)?.nom ?? '—'}
                </td>
                <td>{euros(t.montant_mensuel_cents)}</td>
                <td>{dateFr(t.applicable_du)}</td>
                <td>{t.applicable_au ? dateFr(t.applicable_au) : 'en cours'}</td>
              </tr>
            ))}
          </Tableau>
        )}
      </Section>

      <Section
        numero="4"
        titre="Box"
        note="Les box se créent en série : un préfixe et une plage de numéros suffisent. Le code doit être celui écrit sur la porte — c’est la référence que le client donnera au téléphone."
      >
        {lesSites.length === 0 || lesCategories.length === 0 ? (
          <Attente>Créez d’abord un local et un gabarit.</Attente>
        ) : (
          <FormulaireAction
            action={creerBox}
            bouton="Créer la série"
            champs={[
              {
                nom: 'site_id',
                libelle: 'Local',
                type: 'select',
                obligatoire: true,
                options: optionsSites,
              },
              {
                nom: 'categorie_id',
                libelle: 'Gabarit',
                type: 'select',
                obligatoire: true,
                options: optionsCategories,
              },
              { nom: 'prefixe', libelle: 'Préfixe du code', obligatoire: true, aide: 'Ex. : A-' },
              { nom: 'du', libelle: 'Du numéro', type: 'number', obligatoire: true, defaut: '1' },
              { nom: 'au', libelle: 'Au numéro', type: 'number', obligatoire: true, defaut: '12' },
              { nom: 'etage', libelle: 'Étage ou zone', aide: 'Ex. : rez-de-chaussée' },
            ]}
          />
        )}

        <p className="aide" style={{ marginTop: 18 }}>
          {lesBox.length} box déclaré{lesBox.length > 1 ? 's' : ''} au total.
        </p>
      </Section>
    </Cadre>
  );
}

/* ── Petits blocs de présentation ───────────────────────────────────────── */

function Section({
  numero,
  titre,
  note,
  children,
}: {
  numero: string;
  titre: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="carte">
      <h2 className="carte-titre">
        <span className="numero">{numero}</span>
        {titre}
      </h2>
      <p className="carte-note">{note}</p>
      {children}
    </section>
  );
}

function Attente({ children }: { children: React.ReactNode }) {
  return <p className="aide" style={{ margin: 0, fontStyle: 'italic' }}>{children}</p>;
}

function Tableau({ entetes, children }: { entetes: string[]; children: React.ReactNode }) {
  return (
    <div className="tableau-cadre">
      <table className="tableau">
        <thead>
          <tr>
            {entetes.map((e) => (
              <th key={e}>{e}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
