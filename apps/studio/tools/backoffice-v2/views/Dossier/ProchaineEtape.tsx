/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Carte « Prochaine étape » : le seul endroit de la page où se trouve le
 * bouton plein (4.3). Elle ne décide de rien : elle affiche l'`ActionPrincipale`
 * calculée par `domaine/actionPrincipale.ts` et suit le contrat
 * (1) manques : rien, (2) `ouvre` : fenêtre, (3) `confirmation` : Confirmation
 * puis exécution, (4) sinon exécution directe.
 */
import { useId, useState } from 'react';
import type { ReactElement } from 'react';
import type { ActionPrincipale } from '../../domaine/contrats';
import { Bouton, Carte, Confirmation, Manques } from '../../ui';
import { useContexteDossier } from './ContexteDossier';

export interface ProchaineEtapeProps {
  action: ActionPrincipale;
  /** Vrai tant que le brouillon contient des modifications (le bouton passe en « Enregistrer et … »). */
  modifications: boolean;
}

export function ProchaineEtape({ action, modifications }: ProchaineEtapeProps): ReactElement {
  const ctx = useContexteDossier();
  const idManques = useId();
  const [confirmer, setConfirmer] = useState(false);
  // Verrou anti double clic : le bouton reste « en chargement » jusqu'à la réponse.
  const [enCours, setEnCours] = useState(false);

  const bloque = action.manques.length > 0;
  const sansBouton = action.id === 'aucune';

  async function executer(): Promise<void> {
    setEnCours(true);
    try {
      await ctx.executerAction(action.id);
    } finally {
      setEnCours(false);
      setConfirmer(false);
    }
  }

  function surClic(): void {
    if (bloque || enCours) return;
    if (action.ouvre) ctx.ouvrirFenetre(action.ouvre);
    else if (action.confirmation) setConfirmer(true);
    else void executer();
  }

  return (
    <Carte titre="Prochaine étape">
      {action.phrase ? <p>{action.phrase}</p> : null}
      <Manques manques={action.manques} id={idManques} />
      {sansBouton ? null : (
        <div className="bo-rangee">
          <Bouton
            // Un seul bouton plein par écran : quand la barre d'enregistrement
            // est affichée, c'est elle qui le porte.
            variante={modifications ? 'secondaire' : 'primaire'}
            desactive={bloque}
            chargement={enCours}
            aria-describedby={bloque ? idManques : undefined}
            onClick={surClic}
          >
            {action.libelle}
          </Bouton>
          {action.id === 'accepter' ? (
            <Bouton variante="discret" onClick={() => ctx.ouvrirFenetre('refus')}>
              Le client refuse
            </Bouton>
          ) : null}
        </div>
      )}
      {confirmer && action.confirmation ? (
        <Confirmation
          titre={action.confirmation.titre}
          consequence={action.confirmation.consequence}
          verbe={action.confirmation.verbe}
          chargement={enCours}
          onConfirmer={() => void executer()}
          onAnnuler={() => setConfirmer(false)}
        />
      ) : null}
    </Carte>
  );
}
