'use client';

/**
 * Saisie de clients en texte libre : une phrase dictée, ou un bloc collé depuis
 * un tableur pour reprendre un fichier existant.
 *
 * Comme pour le parc, l'écran impose une relecture. Une fiche client fausse ne
 * se découvre pas le jour même : elle se découvre le jour où une relance part
 * à la mauvaise adresse.
 */
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  analyserClients,
  creerClientsProposes,
  type AnalyseClients,
  type ApplicationClients,
  type FicheProposee,
} from '@/app/clients/assistant';

// Même précaution que pour le parc : des valeurs manifestement fictives, pour
// qu'un collage machinal ne produise pas des fiches clients crédibles.
const EXEMPLE = `Exemple : Prénom Nom, 00 00 00 00 00, adresse@exemple.fr, 0 rue à renseigner, 00000 Ville

Ou collez directement un extrait de tableur :
Nom\tEmail\tTéléphone\tVille
Prénom Nom\tadresse@exemple.fr\t0000000000\tVille
SCI Exemple (contact Prénom Nom)\tcontact@exemple.fr\t0000000000\tVille`;

function Bouton({ libelle, violet }: { libelle: string; violet?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`bouton${violet ? ' bouton-violet' : ''}`} disabled={pending}>
      {pending ? 'Lecture…' : libelle}
    </button>
  );
}

export default function AssistantClients({ disponible }: { disponible: boolean }) {
  const [analyse, lancer] = useActionState<AnalyseClients | null, FormData>(analyserClients, null);
  const [application, appliquer] = useActionState<ApplicationClients | null, FormData>(
    creerClientsProposes,
    null,
  );
  const [brouillon, setBrouillon] = useState<FicheProposee[] | null>(null);

  useEffect(() => {
    if (analyse?.ok) setBrouillon(structuredClone(analyse.fiches));
  }, [analyse]);

  useEffect(() => {
    if (application?.ok) setBrouillon(null);
  }, [application]);

  if (!disponible) return null;

  return (
    <section className="carte" style={{ marginBottom: 22 }}>
      <div className="entete-carte">
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 13,
              background: 'var(--lavande-pale)',
              color: 'var(--violet)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 19,
              flex: 'none',
            }}
          >
            <i className="ph-duotone ph-sparkle" aria-hidden="true" />
          </span>
          <span>
            <h2 className="section-titre">Saisir en texte libre</h2>
            <p className="section-note">
              Dictez un client, ou collez un extrait de tableur pour reprendre un fichier existant —
              le texte grisé n’est qu’un exemple.{' '}
              <strong>Rien n’est enregistré tant que vous n’avez pas validé.</strong>
            </p>
          </span>
        </span>
      </div>

      <form action={lancer} style={{ marginTop: 18 }}>
        <textarea
          className="champ"
          name="description"
          rows={4}
          defaultValue=""
          placeholder={EXEMPLE}
          style={{ resize: 'vertical', lineHeight: 1.6 }}
        />
        <div className="barre-actions">
          <Bouton libelle="Analyser" violet />
          {analyse && !analyse.ok && <span className="retour retour-erreur">{analyse.erreur}</span>}
          {application && (
            <span className={`retour ${application.ok ? 'retour-ok' : 'retour-erreur'}`}>
              {application.ok ? `✓ ${application.message}` : application.erreur}
            </span>
          )}
        </div>
      </form>

      {brouillon && (
        <div style={{ marginTop: 24, borderTop: '1px dashed var(--trait-clair)', paddingTop: 20 }}>
          <p className="groupe-titre">
            {brouillon.length} fiche{brouillon.length > 1 ? 's' : ''} — corrigez avant de valider
          </p>

          {analyse?.ok && analyse.avertissements.length > 0 && (
            <ul
              style={{
                margin: '0 0 18px',
                padding: '12px 16px 12px 32px',
                background: 'var(--ambre-fond)',
                border: '1px solid #f0c674',
                borderRadius: 16,
                fontSize: 12.5,
                lineHeight: 1.6,
                color: 'var(--ambre)',
                fontWeight: 600,
              }}
            >
              {analyse.avertissements.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          )}

          {brouillon.map((f, i) => (
            <div
              key={i}
              style={{
                borderTop: i === 0 ? 'none' : '1px dashed var(--trait-clair)',
                paddingTop: i === 0 ? 0 : 16,
                marginBottom: 16,
              }}
            >
              <div className="grille">
                <label style={{ display: 'block' }}>
                  <span className="etiquette">Type</span>
                  <select
                    className="champ"
                    value={f.type}
                    onChange={(e) => maj(i, { type: e.target.value as FicheProposee['type'] })}
                  >
                    <option value="particulier">Particulier</option>
                    <option value="societe">Société</option>
                  </select>
                </label>
                <Champ libelle="Nom" valeur={f.nom} sur={(v) => maj(i, { nom: v })} />
                {f.type === 'societe' && (
                  <>
                    <Champ
                      libelle="Raison sociale"
                      valeur={f.raison_sociale ?? ''}
                      manquant={!f.raison_sociale}
                      sur={(v) => maj(i, { raison_sociale: v || null })}
                    />
                    <Champ
                      libelle="SIRET"
                      valeur={f.siret ?? ''}
                      manquant={Boolean(f.siret && f.siret.length !== 14)}
                      sur={(v) => maj(i, { siret: v || null })}
                    />
                  </>
                )}
                <Champ
                  libelle="E-mail"
                  valeur={f.email ?? ''}
                  manquant={!f.email && !f.telephone}
                  sur={(v) => maj(i, { email: v || null })}
                />
                <Champ
                  libelle="Téléphone"
                  valeur={f.telephone ?? ''}
                  sur={(v) => maj(i, { telephone: v || null })}
                />
                <Champ
                  libelle="Adresse"
                  valeur={f.adresse ?? ''}
                  sur={(v) => maj(i, { adresse: v || null })}
                />
                <Champ
                  libelle="Code postal"
                  valeur={f.code_postal ?? ''}
                  sur={(v) => maj(i, { code_postal: v || null })}
                />
                <Champ
                  libelle="Ville"
                  valeur={f.ville ?? ''}
                  sur={(v) => maj(i, { ville: v || null })}
                />
              </div>
              <button
                type="button"
                className="bouton-lien"
                style={{ marginTop: 8 }}
                onClick={() => setBrouillon(brouillon.filter((_, j) => j !== i))}
              >
                retirer cette fiche
              </button>
            </div>
          ))}

          <form action={appliquer}>
            <input type="hidden" name="fiches" value={JSON.stringify(brouillon)} />
            <div className="barre-actions">
              <Bouton libelle={`Créer ${brouillon.length} fiche${brouillon.length > 1 ? 's' : ''}`} />
              <button type="button" className="bouton-discret" onClick={() => setBrouillon(null)}>
                Abandonner
              </button>
              <span className="aide" style={{ marginTop: 0 }}>
                Une adresse e-mail déjà connue est sautée, jamais dupliquée.
              </span>
            </div>
          </form>
        </div>
      )}
    </section>
  );

  function maj(i: number, champs: Partial<FicheProposee>) {
    if (!brouillon) return;
    setBrouillon(brouillon.map((f, j) => (i === j ? { ...f, ...champs } : f)));
  }
}

function Champ({
  libelle,
  valeur,
  sur,
  manquant,
}: {
  libelle: string;
  valeur: string;
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
