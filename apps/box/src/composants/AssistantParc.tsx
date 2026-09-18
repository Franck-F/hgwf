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
import { CIEL, CREME, IVOIRE, MARINE, MONO, OR, ROUGE, VERT } from '@/lib/charte';

const EXEMPLE =
  'Entrepôt de Rosny, 12 avenue du Général de Gaulle. 10 box de 3 m² à 49 € codés A-01 à A-10 au rez-de-chaussée, 20 box de 6 m² à 79 € codés B-01 à B-20 au premier étage.';

function BoutonAnalyse() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={{ ...bouton, opacity: pending ? 0.5 : 1 }}>
      {pending ? 'Lecture…' : 'Analyser la description'}
    </button>
  );
}

function BoutonApplique({ nombre }: { nombre: number }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={{ ...bouton, opacity: pending ? 0.5 : 1 }}>
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

  const total = brouillon
    ? brouillon.series.reduce((n, s) => n + (s.au - s.du + 1), 0)
    : 0;

  return (
    <section
      style={{
        background: IVOIRE,
        border: `1.5px solid ${MARINE}`,
        borderRadius: 12,
        padding: 20,
        marginBottom: 22,
      }}
    >
      <h2 style={{ fontSize: 17, margin: '0 0 4px' }}>Décrire le parc en une phrase</h2>
      <p style={{ margin: '0 0 16px', fontSize: 13, opacity: 0.75, lineHeight: 1.5, maxWidth: 760 }}>
        Écrivez votre entrepôt comme vous le diriez au téléphone. La proposition s’affiche ensuite
        pour relecture — <strong>rien n’est enregistré tant que vous n’avez pas validé</strong>.
      </p>

      <form action={lancerAnalyse}>
        <textarea
          name="description"
          rows={3}
          defaultValue=""
          placeholder={EXEMPLE}
          style={{
            width: '100%',
            padding: '11px 12px',
            borderRadius: 8,
            border: `1.5px solid rgba(18,57,91,0.3)`,
            background: CREME,
            resize: 'vertical',
            lineHeight: 1.5,
          }}
        />
        <div style={{ marginTop: 12, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <BoutonAnalyse />
          {analyse && !analyse.ok && (
            <span style={{ color: ROUGE, fontSize: 13.5 }}>{analyse.erreur}</span>
          )}
          {application && (
            <span style={{ color: application.ok ? VERT : ROUGE, fontSize: 13.5, fontWeight: 500 }}>
              {application.ok ? `✓ ${application.message}` : application.erreur}
            </span>
          )}
        </div>
      </form>

      {brouillon && (
        <div style={{ marginTop: 22, borderTop: '1px solid rgba(18,57,91,0.15)', paddingTop: 18 }}>
          <p style={{ ...surtitre, marginTop: 0 }}>Proposition — corrigez avant de valider</p>

          {analyse?.ok && analyse.avertissements.length > 0 && (
            <ul
              style={{
                margin: '0 0 16px',
                padding: '10px 14px 10px 30px',
                background: 'rgba(255,178,62,0.16)',
                border: `1px solid ${OR}`,
                borderRadius: 8,
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
            <div style={{ marginBottom: 18 }}>
              <p style={surtitre}>Local</p>
              <div style={grille}>
                <Champ
                  libelle="Nom"
                  valeur={brouillon.local.nom}
                  sur={(v) =>
                    setBrouillon({ ...brouillon, local: { ...brouillon.local!, nom: v } })
                  }
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
            </div>
          )}

          <p style={surtitre}>Tailles de box</p>
          {brouillon.gabarits.map((g, i) => (
            <div key={i} style={{ ...grille, marginBottom: 10 }}>
              <Champ
                libelle="Nom"
                valeur={g.nom}
                sur={(v) => majGabarit(i, { nom: v })}
              />
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

          <p style={surtitre}>Séries de box</p>
          {brouillon.series.map((s, i) => (
            <div key={i} style={{ ...grille, marginBottom: 10 }}>
              <Champ libelle="Taille" valeur={s.gabarit} sur={(v) => majSerie(i, { gabarit: v })} />
              <Champ libelle="Préfixe" valeur={s.prefixe} sur={(v) => majSerie(i, { prefixe: v })} />
              <Champ libelle="Du n°" valeur={s.du} sur={(v) => majSerie(i, { du: Number(v) })} />
              <Champ libelle="Au n°" valeur={s.au} sur={(v) => majSerie(i, { au: Number(v) })} />
              <Champ
                libelle="Étage"
                valeur={s.etage ?? ''}
                sur={(v) => majSerie(i, { etage: v || null })}
              />
              <div style={{ alignSelf: 'end', paddingBottom: 9, fontFamily: MONO, fontSize: 12.5 }}>
                {s.prefixe}
                {String(s.du).padStart(s.largeur, '0')} → {s.prefixe}
                {String(s.au).padStart(s.largeur, '0')}
              </div>
            </div>
          ))}

          <form action={appliquer} style={{ marginTop: 18 }}>
            <input type="hidden" name="proposition" value={JSON.stringify(brouillon)} />
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <BoutonApplique nombre={total} />
              <button
                type="button"
                onClick={() => setBrouillon(null)}
                style={{
                  background: 'transparent',
                  border: `1.5px solid ${MARINE}`,
                  borderRadius: 8,
                  padding: '10px 16px',
                }}
              >
                Abandonner
              </button>
              <span style={{ fontSize: 12.5, opacity: 0.7 }}>
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
    <label style={{ fontSize: 12.5, display: 'block' }}>
      <span style={{ display: 'block', marginBottom: 4, opacity: 0.75 }}>{libelle}</span>
      <input
        value={valeur}
        onChange={(e) => sur(e.target.value)}
        placeholder={manquant ? 'à compléter' : undefined}
        style={{
          width: '100%',
          padding: '8px 10px',
          borderRadius: 7,
          border: `1.5px solid ${manquant ? OR : 'rgba(18,57,91,0.28)'}`,
          background: manquant ? 'rgba(255,178,62,0.1)' : CREME,
        }}
      />
    </label>
  );
}

const surtitre: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 11.5,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  opacity: 0.65,
  margin: '18px 0 8px',
};

const grille: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  gap: 10,
};

const bouton: React.CSSProperties = {
  background: MARINE,
  color: CREME,
  border: 'none',
  borderRadius: 8,
  padding: '10px 18px',
  fontWeight: 700,
};

export const lienAide = CIEL;
