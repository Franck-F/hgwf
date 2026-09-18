/**
 * Plan d'occupation : la seule question qu'on pose vingt fois par jour au
 * téléphone — « est-ce qu'il vous reste un box ? » — doit se lire d'un coup
 * d'œil, sans cliquer.
 */
import Link from 'next/link';
import { serveur } from '@/lib/supabase-serveur';
import Cadre from '@/composants/Cadre';

export const dynamic = 'force-dynamic';

type BoxLigne = {
  id: string;
  code: string;
  etage: string | null;
  statut: string;
  site: { nom: string } | null;
  categorie_box: { nom: string } | null;
};

type Teinte = { fond: string; texte: string; point: string; libelle: string };

// Repli nommé : un statut inconnu en base ne doit pas casser l'affichage du plan.
const RETIRE: Teinte = { fond: '#f1f3f6', texte: '#94a3b4', point: '#94a3b4', libelle: 'Retiré' };

const COULEURS: Record<string, Teinte> = {
  disponible: { fond: '#eaf5ef', texte: '#2e7d5b', point: '#2e7d5b', libelle: 'Disponible' },
  occupe: { fond: '#12395b', texte: '#ffffff', point: '#12395b', libelle: 'Occupé' },
  reserve: { fond: '#fff4e2', texte: '#8a5a00', point: '#ffb23e', libelle: 'Réservé' },
  maintenance: { fond: '#ffeeec', texte: '#c24435', point: '#ff6f5e', libelle: 'Maintenance' },
  retire: RETIRE,
};

export default async function Occupation() {
  const client = await serveur();

  const { data } = await client
    .from('box')
    .select('id, code, etage, statut, site(nom), categorie_box(nom)')
    .is('archive_le', null)
    .order('code');

  const lesBox = (data ?? []) as unknown as BoxLigne[];

  if (lesBox.length === 0) {
    return (
      <Cadre actif="/" titre="Occupation">
        <div className="carte" style={{ maxWidth: 620 }}>
          <h2 className="carte-titre">Le parc n’est pas encore déclaré</h2>
          <p className="carte-note">
            Décrivez votre entrepôt en une phrase, ou remplissez les sections une à une. Rien n’est
            écrit d’avance : tout se saisit depuis le paramétrage, et se corrige ensuite.
          </p>
          <Link href="/parametrage" className="bouton" style={{ display: 'inline-block' }}>
            Commencer le paramétrage
          </Link>
        </div>
      </Cadre>
    );
  }

  const comptes = lesBox.reduce<Record<string, number>>((acc, b) => {
    acc[b.statut] = (acc[b.statut] ?? 0) + 1;
    return acc;
  }, {});

  const libres = comptes.disponible ?? 0;
  const tauxOccupation = Math.round(((lesBox.length - libres) / lesBox.length) * 100);

  // Regroupement par local puis par étage : c'est ainsi qu'on marche dans
  // l'entrepôt, donc c'est ainsi qu'on doit le lire.
  const parLocal = new Map<string, Map<string, BoxLigne[]>>();
  for (const b of lesBox) {
    const local = b.site?.nom ?? 'Local inconnu';
    const etage = b.etage?.trim() || 'Sans étage précisé';
    if (!parLocal.has(local)) parLocal.set(local, new Map());
    const etages = parLocal.get(local)!;
    if (!etages.has(etage)) etages.set(etage, []);
    etages.get(etage)!.push(b);
  }

  return (
    <Cadre
      actif="/"
      titre="Occupation"
      chapeau={`${lesBox.length} box au total, ${libres} disponible${libres > 1 ? 's' : ''}.`}
    >
      <div className="stats">
        <div className="stat">
          <div className="stat-valeur">{tauxOccupation} %</div>
          <div className="stat-libelle">Taux d’occupation</div>
        </div>

        {Object.entries(COULEURS).map(([cle, c]) => {
          const n = comptes[cle] ?? 0;
          if (n === 0 && cle !== 'disponible' && cle !== 'occupe') return null;
          return (
            <div className="stat" key={cle}>
              <div className="stat-valeur">{n}</div>
              <div className="stat-libelle">
                <span className="pastille" style={{ background: c.point }} />
                {c.libelle}
              </div>
            </div>
          );
        })}
      </div>

      {[...parLocal.entries()].map(([local, etages]) => (
        <section className="carte" key={local}>
          <h2 className="carte-titre">{local}</h2>

          {[...etages.entries()].map(([etage, box]) => (
            <div key={etage} style={{ marginTop: 18 }}>
              <p className="surtitre">
                {etage} · {box.length} box
              </p>
              <div className="plan">
                {box.map((b) => {
                  const c = COULEURS[b.statut] ?? RETIRE;
                  return (
                    <span
                      key={b.id}
                      className="jeton"
                      title={`${b.code} · ${b.categorie_box?.nom ?? '?'} · ${c.libelle}`}
                      style={{ background: c.fond, color: c.texte }}
                    >
                      {b.code}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ))}

      <p className="aide" style={{ marginTop: 20, maxWidth: '70ch' }}>
        Le statut d’un box passera à « occupé » automatiquement dès que les contrats seront
        branchés. Pour l’instant il se règle à la main depuis le{' '}
        <Link href="/parametrage" style={{ color: 'var(--ciel)' }}>
          paramétrage
        </Link>
        .
      </p>
    </Cadre>
  );
}
