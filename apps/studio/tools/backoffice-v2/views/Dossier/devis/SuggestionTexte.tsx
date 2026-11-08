/** @jsxRuntime automatic @jsxImportSource react */
/**
 * « Suggérer un texte » : suggestion IA du champ `description` uniquement.
 * Le bouton est TOUJOURS affiché, même sans clé d'envoi : un clic sans clé
 * ouvre la fenêtre « Clé d'envoi », puis relance la suggestion (4.3). La
 * proposition n'est jamais écrite d'office : seul « Utiliser » la transmet.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { suggererDescription } from '../../../actions/suggestion';
import { useCleApi } from '../../../app/Contexte';
import type { Dossier } from '../../../domaine/types';
import { Bouton } from '../../../ui';
import { texteEchec, useContexteDossierOptionnel } from '../ContexteDossier';
import { useAvecCle, useContexteEcriture } from './outilsVue';

export interface SuggestionTexteProps {
  dossier: Dossier;
  /** Appelé uniquement sur « Utiliser » : la suggestion n'est jamais écrite d'office. */
  onUtiliser: (description: string) => void;
}

export function SuggestionTexte({ dossier, onUtiliser }: SuggestionTexteProps): ReactElement {
  const ctx = useContexteEcriture();
  const avecCle = useAvecCle();
  const { presente, demanderCle } = useCleApi();
  // Brouillon courant si on est sous la page Dossier, sinon rien (aperçu isolé).
  const brouillon = useContexteDossierOptionnel()?.brouillon ?? {};
  const [enCours, setEnCours] = useState(false);
  const [proposition, setProposition] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function suggerer(): Promise<void> {
    if (enCours) return;
    setErreur(null);
    setProposition(null);
    // Sans clé : on la demande d'abord ; si l'équipe renonce, on s'arrête là sans erreur.
    if (!presente && !(await demanderCle())) return;
    setEnCours(true);
    try {
      const r = await avecCle(() => suggererDescription(ctx, dossier, brouillon));
      if (r.ok) setProposition(r.description);
      else setErreur(texteEchec(r));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="bo-pile">
      <div>
        <Bouton variante="discret" taille="s" chargement={enCours} onClick={() => void suggerer()}>
          Suggérer un texte
        </Bouton>
      </div>
      {erreur ? (
        <p className="bo-erreur" role="alert">
          {erreur}
        </p>
      ) : null}
      {proposition !== null ? (
        <div className="bo-bandeau bo-bandeau--info" role="group" aria-label="Texte suggéré">
          <div className="bo-pile">
            {proposition.split('\n').map((ligne, i) => (
              // Les sauts de ligne de la suggestion sont conservés sans style en ligne.
              <p key={i}>{ligne}</p>
            ))}
          </div>
          <span className="bo-rangee">
            <Bouton
              variante="secondaire"
              taille="s"
              onClick={() => {
                onUtiliser(proposition);
                setProposition(null);
              }}
            >
              Utiliser
            </Bouton>
            <Bouton variante="discret" taille="s" onClick={() => setProposition(null)}>
              Ignorer
            </Bouton>
          </span>
        </div>
      ) : null}
    </div>
  );
}
