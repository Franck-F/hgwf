/**
 * Tableau de bord de l'occupation.
 *
 * La question posée vingt fois par jour au téléphone — « il vous reste un
 * box ? » — doit se lire sans cliquer. Le reste de l'écran répond aux deux
 * suivantes : combien ça rapporte, et qu'est-ce qui cloche.
 */
import Link from 'next/link';
import { serveur } from '@/lib/supabase-serveur';
import Cadre from '@/composants/Cadre';
import { euros } from '@/lib/charte';

export const dynamic = 'force-dynamic';

type BoxLigne = {
  id: string;
  code: string;
  etage: string | null;
  statut: string;
  categorie_id: string;
  site: { nom: string } | null;
  categorie_box: { nom: string } | null;
};

type Teinte = { fond: string; texte: string; libelle: string };

// Repli nommé : un statut inconnu en base ne doit pas casser l'affichage.
const RETIRE: Teinte = { fond: '#f2f1fa', texte: '#a2a3b8', libelle: 'Retiré' };

const COULEURS: Record<string, Teinte> = {
  disponible: { fond: '#e5f6ec', texte: '#2fa96b', libelle: 'Disponible' },
  occupe: { fond: '#16182c', texte: '#ffffff', libelle: 'Occupé' },
  reserve: { fond: '#ede9ff', texte: '#6250d8', libelle: 'Réservé' },
  maintenance: { fond: '#fdeaf0', texte: '#e8407a', libelle: 'Maintenance' },
  retire: RETIRE,
};

export default async function Occupation() {
  const client = await serveur();

  const [{ data: boxData }, { data: catData }, { data: tarifData }, { data: mvtData }] =
    await Promise.all([
      client
        .from('box')
        .select('id, code, etage, statut, categorie_id, site(nom), categorie_box(nom)')
        .is('archive_le', null)
        .order('code'),
      client.from('categorie_box').select('id, nom').is('archive_le', null),
      client
        .from('tarif')
        .select('categorie_id, montant_mensuel_cents, applicable_du, applicable_au')
        .is('applicable_au', null)
        .order('applicable_du', { ascending: false }),
      client
        .from('mouvement')
        .select('id, survenu_le, type, detail')
        .order('survenu_le', { ascending: false })
        .limit(4),
    ]);

  const lesBox = (boxData ?? []) as unknown as BoxLigne[];
  const lesCategories = (catData ?? []) as { id: string; nom: string }[];
  const lesMouvements = (mvtData ?? []) as {
    id: number;
    survenu_le: string;
    type: string;
    detail: string;
  }[];

  const tarifParCategorie = new Map<string, number>();
  for (const t of (tarifData ?? []) as { categorie_id: string; montant_mensuel_cents: number }[]) {
    if (!tarifParCategorie.has(t.categorie_id)) {
      tarifParCategorie.set(t.categorie_id, t.montant_mensuel_cents);
    }
  }

  if (lesBox.length === 0) return <Vide />;

  const comptes = lesBox.reduce<Record<string, number>>((acc, b) => {
    acc[b.statut] = (acc[b.statut] ?? 0) + 1;
    return acc;
  }, {});

  const libres = comptes.disponible ?? 0;
  const occupes = comptes.occupe ?? 0;
  const taux = Math.round((occupes / lesBox.length) * 100);

  // Deux chiffres différents, et il ne faut pas les confondre : ce que le parc
  // rapporterait s'il était plein, et ce qu'il rapporte aujourd'hui.
  let potentielCents = 0;
  let encaisseCents = 0;
  let sansTarif = 0;
  for (const b of lesBox) {
    const prix = tarifParCategorie.get(b.categorie_id);
    if (prix === undefined) {
      sansTarif += 1;
      continue;
    }
    if (b.statut !== 'retire') potentielCents += prix;
    if (b.statut === 'occupe') encaisseCents += prix;
  }

  // Répartition par gabarit, pour savoir quelle taille manque.
  const parGabarit = lesCategories
    .map((c) => {
      const dedans = lesBox.filter((b) => b.categorie_id === c.id);
      const pris = dedans.filter((b) => b.statut === 'occupe').length;
      return {
        nom: c.nom,
        total: dedans.length,
        pris,
        part: dedans.length ? Math.round((pris / dedans.length) * 100) : 0,
        prix: tarifParCategorie.get(c.id) ?? null,
      };
    })
    .filter((g) => g.total > 0);

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

  const alertes: { ton: 'rose' | 'ambre'; titre: string; detail: string }[] = [];
  if (sansTarif > 0) {
    alertes.push({
      ton: 'rose',
      titre: `${sansTarif} box sans tarif`,
      detail: 'Leur gabarit n’a aucun prix en cours : ils ne comptent pas dans le potentiel.',
    });
  }
  if ((comptes.maintenance ?? 0) > 0) {
    alertes.push({
      ton: 'ambre',
      titre: `${comptes.maintenance} box en maintenance`,
      detail: 'Indisponibles à la location tant que le statut n’a pas changé.',
    });
  }

  return (
    <Cadre actif="/">
      {/* ── Rangée d'accueil ─────────────────────────────────────────── */}
      <div className="grille-hero">
        <div style={{ paddingTop: 6 }}>
          <h1 className="hero-titre">
            Bonjour 👋
            <br />
            {libres > 0 ? (
              <>
                Il reste <span style={{ color: 'var(--violet)' }}>{libres} box</span>
                <br />
                à louer aujourd’hui.
              </>
            ) : (
              <>
                Le parc est
                <br />
                complet aujourd’hui.
              </>
            )}
          </h1>
          <p className="hero-appui">
            {lesBox.length} box déclarés, {occupes} occupé{occupes > 1 ? 's' : ''}. Le plan
            ci-dessous montre chaque emplacement à sa place réelle dans l’entrepôt.
          </p>
        </div>

        <Link href="/parametrage" className="tuile-ajout" title="Ajouter des box">
          <span className="tuile-ajout-rond">
            <i className="ph ph-plus" aria-hidden="true" />
          </span>
        </Link>

        <Stat valeur={`${taux} %`} libelle="Taux d’occupation" icone="ph-chart-pie-slice" />
        <Stat
          valeur={euros(encaisseCents)}
          libelle="Loyer mensuel en cours"
          icone="ph-currency-eur"
        />
        <Stat
          valeur={euros(potentielCents)}
          libelle="Potentiel si complet"
          icone="ph-trend-up"
          discret
        />
      </div>

      {/* ── Rangée du milieu ─────────────────────────────────────────── */}
      <div className="grille-3">
        <section className="carte">
          <div className="entete-carte">
            <h2 className="section-titre">À surveiller</h2>
          </div>

          {alertes.length === 0 ? (
            <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center' }}>
              <span
                className="beignet"
                style={{ width: 40, height: 40, background: 'var(--vert-fond)', color: 'var(--vert)' }}
              >
                <i className="ph-duotone ph-check-circle" style={{ fontSize: 20 }} aria-hidden="true" />
              </span>
              <p className="section-note" style={{ margin: 0 }}>
                Rien à signaler : chaque gabarit a un tarif en cours, aucun box n’est bloqué.
              </p>
            </div>
          ) : (
            <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
              {alertes.map((a) => (
                <div
                  key={a.titre}
                  style={{
                    background: 'var(--blanc)',
                    borderRadius: 16,
                    boxShadow: 'var(--ombre-relief)',
                    padding: '14px 16px',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 14,
                      bottom: 14,
                      width: 4,
                      borderRadius: 4,
                      background: a.ton === 'rose' ? 'var(--rose)' : '#f0c674',
                    }}
                  />
                  <div className="ligne-titre">{a.titre}</div>
                  <div className="ligne-detail">{a.detail}</div>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              background: 'var(--fond-tres-doux)',
              border: '1px solid #f0eff8',
              borderRadius: 16,
              padding: '14px 16px',
            }}
          >
            <div className="ligne-titre">Contrats — pas encore branchés</div>
            <div className="ligne-detail">
              Le statut d’un box se règle à la main tant que l’entrée et la sortie d’un client ne
              sont pas construites.
            </div>
          </div>
        </section>

        <section className="carte">
          <div className="entete-carte">
            <h2 className="section-titre">Par gabarit</h2>
            <Link href="/parametrage" className="bouton-discret">
              <i className="ph ph-pencil-simple" aria-hidden="true" /> Modifier
            </Link>
          </div>

          <div style={{ marginTop: 6 }}>
            {parGabarit.map((g) => (
              <div key={g.nom} className="ligne" style={{ gridTemplateColumns: '1fr auto' }}>
                <div>
                  <div className="ligne-titre">{g.nom}</div>
                  <div className="ligne-detail">
                    {g.pris} occupé{g.pris > 1 ? 's' : ''} sur {g.total}
                    {g.prix !== null && <> · {euros(g.prix)} par mois</>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                    <span className="jauge">
                      <span className="jauge-remplie" style={{ width: `${g.part}%` }} />
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800 }}>{g.part}%</span>
                  </div>
                </div>
                <span className={`etiq ${g.prix === null ? 'etiq-rose' : 'etiq-douce'}`}>
                  {g.prix === null ? 'sans tarif' : `${g.total} box`}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="carte">
          <div className="entete-carte">
            <h2 className="section-titre">Derniers mouvements</h2>
          </div>
          <p className="section-note">
            Journal non modifiable : entrées, sorties, incidents. C’est la base de toute enquête en
            cas de litige.
          </p>

          {lesMouvements.length === 0 ? (
            <p className="aide" style={{ marginTop: 14 }}>
              Aucun mouvement enregistré pour l’instant.
            </p>
          ) : (
            <div style={{ marginTop: 6 }}>
              {lesMouvements.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '13px 0',
                    borderBottom: '1px dashed var(--trait-clair)',
                  }}
                >
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: 'var(--fond-doux)',
                      color: 'var(--violet)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 17,
                      flex: 'none',
                    }}
                  >
                    <i className="ph-duotone ph-arrows-left-right" aria-hidden="true" />
                  </span>
                  <span style={{ flex: 1 }}>
                    <span className="ligne-titre" style={{ display: 'block' }}>
                      {m.detail}
                    </span>
                    <span className="ligne-detail" style={{ display: 'block' }}>
                      {m.type} ·{' '}
                      {new Date(m.survenu_le).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Rangée du bas ────────────────────────────────────────────── */}
      <div className="grille-bas">
        <section className="carte">
          <div className="entete-carte">
            <h2 className="section-titre">Plan d’occupation</h2>
            <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(COULEURS).map(([cle, c]) => {
                const n = comptes[cle] ?? 0;
                if (n === 0 && cle !== 'disponible' && cle !== 'occupe') return null;
                return (
                  <span key={cle} className="etiq etiq-douce" style={{ fontSize: 11 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: cle === 'occupe' ? 'var(--encre)' : c.texte,
                        marginRight: 6,
                      }}
                    />
                    {c.libelle} {n}
                  </span>
                );
              })}
            </span>
          </div>

          {[...parLocal.entries()].map(([local, etages]) => (
            <div key={local} style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 14.5, fontWeight: 800, margin: '0 0 14px' }}>{local}</h3>
              {[...etages.entries()].map(([etage, box]) => (
                <div key={etage} style={{ marginBottom: 18 }}>
                  <p className="groupe-titre">
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
            </div>
          ))}
        </section>

        <section
          className="carte carte-violette"
          style={{ display: 'flex', flexDirection: 'column', textAlign: 'center' }}
        >
          <span
            style={{
              width: 54,
              height: 54,
              borderRadius: 18,
              background: 'rgba(255,255,255,0.18)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 26,
              margin: '6px auto 0',
            }}
          >
            <i className="ph-duotone ph-sparkle" aria-hidden="true" />
          </span>
          <h2 className="section-titre" style={{ marginTop: 16 }}>
            Décrire en une phrase
          </h2>
          <p className="section-note" style={{ marginTop: 8 }}>
            Dictez votre entrepôt comme au téléphone, l’assistance en tire la structure. Vous relisez
            avant que quoi que ce soit ne soit enregistré.
          </p>
          <Link
            href="/parametrage"
            className="bouton"
            style={{ marginTop: 'auto', display: 'inline-block' }}
          >
            Ouvrir l’assistant
          </Link>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
            <Beignet
              part={taux}
              surtitre="Occupation"
              titre="Parc entier"
              detail={`${occupes} box loués sur ${lesBox.length}`}
            />
            <Beignet
              part={lesBox.length ? Math.round((libres / lesBox.length) * 100) : 0}
              surtitre="Disponible"
              titre="À louer"
              detail={`${libres} box prêts à partir`}
            />
          </div>

          <section className="carte">
            <div className="entete-carte">
              <h2 className="section-titre">Prochaine étape</h2>
            </div>
            <p className="section-note" style={{ marginTop: 10 }}>
              Clients et contrats : entrée, sortie, préavis. Le statut d’un box passera alors à
              « occupé » tout seul, et les loyers dus se calculeront.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
              <span className="etiq etiq-douce">Phase 2</span>
              <span className="etiq etiq-verte">Base déjà prête</span>
            </div>
          </section>
        </div>
      </div>
    </Cadre>
  );
}

/* ── Blocs ──────────────────────────────────────────────────────────────── */

function Stat({
  valeur,
  libelle,
  icone,
  discret,
}: {
  valeur: string;
  libelle: string;
  icone: string;
  discret?: boolean;
}) {
  return (
    <div className="carte" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span
        style={{
          width: 38,
          height: 38,
          borderRadius: 13,
          background: discret ? 'var(--fond-doux)' : 'var(--lavande-pale)',
          color: 'var(--violet)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 19,
        }}
      >
        <i className={`ph-duotone ${icone}`} aria-hidden="true" />
      </span>
      <span style={{ marginTop: 'auto' }}>
        <span className="stat-valeur" style={{ display: 'block' }}>
          {valeur}
        </span>
        <span className="stat-libelle" style={{ display: 'block' }}>
          {libelle}
        </span>
      </span>
    </div>
  );
}

function Beignet({
  part,
  surtitre,
  titre,
  detail,
}: {
  part: number;
  surtitre: string;
  titre: string;
  detail: string;
}) {
  return (
    <div className="carte" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <span
        className="beignet"
        style={{
          background: `conic-gradient(var(--violet) 0 ${part}%, #efeef8 ${part}% 100%)`,
        }}
      >
        <span className="beignet-creux">{part}%</span>
      </span>
      <span>
        <span className="surtitre" style={{ display: 'block' }}>
          {surtitre}
        </span>
        <span style={{ fontSize: 14, fontWeight: 800, display: 'block', marginTop: 3 }}>
          {titre}
        </span>
        <span
          style={{
            fontSize: 10.5,
            color: 'var(--gris-faible)',
            marginTop: 5,
            lineHeight: 1.5,
            display: 'block',
          }}
        >
          {detail}
        </span>
      </span>
    </div>
  );
}

function Vide() {
  return (
    <Cadre actif="/">
      <div className="grille-hero" style={{ gridTemplateColumns: 'minmax(320px, 1fr) 190px' }}>
        <div style={{ paddingTop: 6 }}>
          <h1 className="hero-titre">
            Bonjour 👋
            <br />
            Votre parc n’est
            <br />
            pas encore déclaré.
          </h1>
          <p className="hero-appui">
            Décrivez votre entrepôt en une phrase, ou remplissez les sections une à une. Rien n’est
            écrit d’avance : tout se saisit depuis le paramétrage, et se corrige ensuite.
          </p>
          <Link href="/parametrage" className="bouton" style={{ display: 'inline-block', marginTop: 24 }}>
            Commencer le paramétrage
          </Link>
        </div>
        <Link href="/parametrage" className="tuile-ajout" title="Déclarer le parc">
          <span className="tuile-ajout-rond">
            <i className="ph ph-plus" aria-hidden="true" />
          </span>
        </Link>
      </div>
    </Cadre>
  );
}
