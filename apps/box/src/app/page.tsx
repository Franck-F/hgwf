/**
 * Plan d'occupation : la seule question qu'on pose vingt fois par jour au
 * téléphone — « est-ce qu'il vous reste un box ? » — doit se lire d'un coup
 * d'œil, sans cliquer.
 */
import Link from 'next/link';
import { serveur } from '@/lib/supabase-serveur';
import Cadre, { carte } from '@/composants/Cadre';
import { CIEL, CORAIL, IVOIRE, MARINE, MONO, VERT } from '@/lib/charte';

export const dynamic = 'force-dynamic';

type BoxLigne = {
  id: string;
  code: string;
  etage: string | null;
  statut: string;
  site: { nom: string } | null;
  categorie_box: { nom: string } | null;
};

type Teinte = { fond: string; texte: string; libelle: string };

// Repli nommé : un statut inconnu en base ne doit pas casser l'affichage du plan.
const RETIRE: Teinte = { fond: 'rgba(18,57,91,0.1)', texte: 'rgba(18,57,91,0.55)', libelle: 'Retiré' };

const COULEURS: Record<string, Teinte> = {
  disponible: { fond: 'rgba(46,125,91,0.14)', texte: VERT, libelle: 'Disponible' },
  occupe: { fond: MARINE, texte: IVOIRE, libelle: 'Occupé' },
  reserve: { fond: 'rgba(255,178,62,0.25)', texte: '#8A5A00', libelle: 'Réservé' },
  maintenance: { fond: 'rgba(255,111,94,0.2)', texte: CORAIL, libelle: 'Maintenance' },
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
        <div style={{ ...carte, maxWidth: 620 }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 17 }}>Le parc n’est pas encore déclaré</h2>
          <p style={{ margin: '0 0 18px', lineHeight: 1.55, opacity: 0.8 }}>
            Déclarez votre local, vos gabarits de box et leurs tarifs. Rien n’est écrit d’avance :
            tout se saisit depuis le paramétrage, et se corrige ensuite.
          </p>
          <Link
            href="/parametrage"
            style={{
              display: 'inline-block',
              background: MARINE,
              color: IVOIRE,
              textDecoration: 'none',
              borderRadius: 8,
              padding: '11px 18px',
              fontWeight: 700,
            }}
          >
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
    <Cadre actif="/" titre="Occupation">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        {Object.entries(COULEURS).map(([cle, c]) => {
          const n = comptes[cle] ?? 0;
          if (n === 0 && cle !== 'disponible' && cle !== 'occupe') return null;
          return (
            <div
              key={cle}
              style={{
                ...carte,
                padding: '12px 18px',
                minWidth: 118,
                borderColor: 'rgba(18,57,91,0.18)',
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 700, color: c.texte === IVOIRE ? MARINE : c.texte }}>
                {n}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', opacity: 0.7 }}>
                {c.libelle}
              </div>
            </div>
          );
        })}
      </div>

      {[...parLocal.entries()].map(([local, etages]) => (
        <section key={local} style={{ ...carte, marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, margin: '0 0 16px' }}>{local}</h2>

          {[...etages.entries()].map(([etage, box]) => (
            <div key={etage} style={{ marginBottom: 18 }}>
              <p
                style={{
                  fontFamily: MONO,
                  fontSize: 11.5,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  opacity: 0.65,
                  margin: '0 0 9px',
                }}
              >
                {etage} · {box.length} box
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {box.map((b) => {
                  const c = COULEURS[b.statut] ?? RETIRE;
                  return (
                    <span
                      key={b.id}
                      title={`${b.code} · ${b.categorie_box?.nom ?? '?'} · ${c.libelle}`}
                      style={{
                        background: c.fond,
                        color: c.texte,
                        border: `1px solid ${c.texte === IVOIRE ? MARINE : 'rgba(18,57,91,0.18)'}`,
                        borderRadius: 7,
                        padding: '7px 11px',
                        fontFamily: MONO,
                        fontSize: 12.5,
                        fontWeight: 700,
                      }}
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

      <p style={{ fontSize: 13, opacity: 0.7, maxWidth: 700, lineHeight: 1.55 }}>
        Le statut d’un box passera à « occupé » automatiquement dès que les contrats seront
        branchés. Pour l’instant il se règle à la main.{' '}
        <Link href="/parametrage" style={{ color: CIEL }}>
          Paramétrage
        </Link>
      </p>
    </Cadre>
  );
}
