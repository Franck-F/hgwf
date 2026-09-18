'use client';

/**
 * Décrire son parc en français plutôt que remplir quatre formulaires.
 *
 * L'écran impose une relecture : l'assistance propose, l'utilisateur corrige
 * dans le tableau, et rien ne part en base avant un second clic. Une valeur
 * qu'un modèle a devinée et qu'on écrit sans la voir est une valeur fausse qui
 * ne se découvre que six mois plus tard, sur une facture.
 */
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  analyserParc,
  appliquerParc,
  type Analyse,
  type Application,
  type Proposition,
} from '@/app/parametrage/assistant';

const EXEMPLE =
  'Entrepôt de Rosny, 12 avenue du Général de Gaulle. 10 box de 3 m² à 49 € codés A-01 à A-10 au rez-de-chaussée, 20 box de 6 m² à 79 € codés B-01 à B-20 au premier étage.';

function BoutonAnalyse() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="bouton" disabled={pending}>
      {pending ? 'Lecture…' : 'Analyser'}
    </button>
  );
}

function BoutonApplique({ nombre }: { nombre: number }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="bouton" disabled={pending}>
      {pending ? 'Création…' : `Créer ${nombre} box et leurs tarifs`}
    </button>
  );
}

export default function AssistantParc({ disponible }: { disponible: boolean }) {
  const [analyse, lancerAnalyse] = useActionState<Analyse | null, FormData>(analyserParc, null);
  const [application, appliquer] = useActionState<Application | null, FormData>(appliquerParc, null);
  const [brouillon, setBrouillon] = useState<Proposition | null>(null);

  // La proposition devient modifiable dès qu'elle arrive : le tableau affiché
  // est le brouillon, pas la réponse brute.
  useEffect(() => {
    if (analyse?.ok) setBrouillon(structuredClone(analyse.proposition));
  }, [analyse]);

  useEffect(() => {
    if (application?.ok) setBrouillon(null);
  }, [application]);

  if (!disponible) return null;

  const total = brouillon ? brouillon.series.reduce((n, s) => n + (s.au - s.du + 1), 0) : 0;

  return (
    <section className="carte" style={{ marginBottom: 18 }}>
      <h2 className="carte-titre">
        <span className="numero" aria-hidden="true">
          ✦
        </span>
        Décrire le parc en une phrase
      </h2>
      <p className="carte-note">
        Écrivez votre entrepôt comme vous le diriez au téléphone. La proposition s’affiche ensuite
        pour relecture — <strong>rien n’est enregistré tant que vous n’avez pas validé</strong>.
      </p>

      <form action={lancerAnalyse}>
        <textarea
          className="champ"
          name="description"
          rows={3}
          defaultValue=""
          placeholder={EXEMPLE}
          style={{ resize: 'vertical', lineHeight: 1.55 }}
        />
        <div className="barre-actions">
          <BoutonAnalyse />
          {analyse && !analyse.ok && <span className="retour retour-erreur">{analyse.erreur}</span>}
          {application && (
            <span className={`retour ${application.ok ? 'retour-ok' : 'retour-erreur'}`}>
              {application.ok ? `✓ ${application.message}` : application.erreur}
            </span>
          )}
        </div>
      </form>

      {brouillon && (
        <div style={{ marginTop: 24, borderTop: '1px solid var(--trait)', paddingTop: 20 }}>
          <p className="surtitre">Proposition — corrigez avant de valider</p>

          {analyse?.ok && analyse.avertissements.length > 0 && (
            <ul
              style={{
                margin: '0 0 18px',
                padding: '12px 16px 12px 32px',
                background: 'rgba(255,178,62,0.12)',
                border: '1px solid rgba(255,178,62,0.5)',
                borderRadius: 'var(--r-controle)',
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {analyse.avertissements.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}

          {brouillon.local && (
            <>
              <p className="surtitre" style={{ marginTop: 20 }}>
                Local
              </p>
              <div className="grille">
                <Champ
                  libelle="Nom"
                  valeur={brouillon.local.nom}
                  sur={(v) => setBrouillon({ ...brouillon, local: { ...brouillon.local!, nom: v } })}
                />
                <Champ
                  libelle="Adresse"
                  valeur={brouillon.local.adresse}
                  sur={(v) =>
                    setBrouillon({ ...brouillon, local: { ...brouillon.local!, adresse: v } })
                  }
                />
                <Champ
                  libelle="Code postal"
                  valeur={brouillon.local.code_postal}
                  sur={(v) =>
                    setBrouillon({ ...brouillon, local: { ...brouillon.local!, code_postal: v } })
                  }
                />
                <Champ
                  libelle="Ville"
                  valeur={brouillon.local.ville}
                  sur={(v) =>
                    setBrouillon({ ...brouillon, local: { ...brouillon.local!, ville: v } })
                  }
                />
              </div>
            </>
          )}

          <p className="surtitre" style={{ marginTop: 22 }}>
            Tailles de box
          </p>
          {brouillon.gabarits.map((g, i) => (
            <div className="grille" key={i} style={{ marginBottom: 12 }}>
              <Champ libelle="Nom" valeur={g.nom} sur={(v) => majGabarit(i, { nom: v })} />
              <Champ
                libelle="Surface (m²)"
                valeur={g.surface_m2 ?? ''}
                sur={(v) => majGabarit(i, { surface_m2: v === '' ? null : Number(v) })}
              />
              <Champ
                libelle="Loyer mensuel (€)"
                valeur={g.tarif_mensuel_euros ?? ''}
                manquant={g.tarif_mensuel_euros === null}
                sur={(v) => majGabarit(i, { tarif_mensuel_euros: v === '' ? null : Number(v) })}
              />
            </div>
          ))}

          <p className="surtitre" style={{ marginTop: 22 }}>
            Séries de box
          </p>
          {brouillon.series.map((s, i) => (
            <div className="grille" key={i} style={{ marginBottom: 12 }}>
              <Champ libelle="Taille" valeur={s.gabarit} sur={(v) => majSerie(i, { gabarit: v })} />
              <Champ libelle="Préfixe" valeur={s.prefixe} sur={(v) => majSerie(i, { prefixe: v })} />
              <Champ libelle="Du n°" valeur={s.du} sur={(v) => majSerie(i, { du: Number(v) })} />
              <Champ libelle="Au n°" valeur={s.au} sur={(v) => majSerie(i, { au: Number(v) })} />
              <Champ
                libelle="Étage"
                valeur={s.etage ?? ''}
                sur={(v) => majSerie(i, { etage: v || null })}
              />
              <div
                style={{
                  alignSelf: 'end',
                  paddingBottom: 11,
                  fontFamily: 'var(--mono)',
                  fontSize: 12,
                  color: 'var(--texte-faible)',
                }}
              >
                {s.prefixe}
                {String(s.du).padStart(s.largeur, '0')} → {s.prefixe}
                {String(s.au).padStart(s.largeur, '0')}
              </div>
            </div>
          ))}

          <form action={appliquer}>
            <input type="hidden" name="proposition" value={JSON.stringify(brouillon)} />
            <div className="barre-actions">
              <BoutonApplique nombre={total} />
              <button type="button" className="bouton-fantome" onClick={() => setBrouillon(null)}>
                Abandonner
              </button>
              <span className="aide" style={{ marginTop: 0 }}>
                Un code déjà utilisé sera sauté, jamais écrasé.
              </span>
            </div>
          </form>
        </div>
      )}
    </section>
  );

  function majGabarit(i: number, champs: Partial<Proposition['gabarits'][number]>) {
    if (!brouillon) return;
    const gabarits = brouillon.gabarits.map((g, j) => (i === j ? { ...g, ...champs } : g));
    setBrouillon({ ...brouillon, gabarits });
  }

  function majSerie(i: number, champs: Partial<Proposition['series'][number]>) {
    if (!brouillon) return;
    const series = brouillon.series.map((s, j) => (i === j ? { ...s, ...champs } : s));
    setBrouillon({ ...brouillon, series });
  }
}

function Champ({
  libelle,
  valeur,
  sur,
  manquant,
}: {
  libelle: string;
  valeur: string | number;
  sur: (v: string) => void;
  manquant?: boolean;
}) {
  return (
    <label style={{ display: 'block' }}>
      <span className="etiquette">{libelle}</span>
      <input
        className={`champ${manquant ? ' champ-manquant' : ''}`}
        value={valeur}
        onChange={(e) => sur(e.target.value)}
        placeholder={manquant ? 'à compléter' : undefined}
      />
    </label>
  );
}
