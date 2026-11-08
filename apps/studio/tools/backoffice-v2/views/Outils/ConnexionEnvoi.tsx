/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Connexion à l'envoi (4.7, 4.9) : état de la clé enregistrée sur cet
 * ordinateur, « Saisir la clé » (fenêtre de la coque) et « Oublier la clé ».
 * La clé n'est jamais affichée.
 */
import type { ReactElement } from 'react';
import { useCleApi, useToasts } from '../../app/Contexte';
import { Badge, Bouton, Carte } from '../../ui';

export function ConnexionEnvoi(): ReactElement {
  const { presente, demanderCle, oublier } = useCleApi();
  const toasts = useToasts();

  async function saisir(): Promise<void> {
    if (await demanderCle()) toasts.succes('Clé d’envoi enregistrée sur cet ordinateur');
  }

  function oublierLaCle(): void {
    oublier();
    toasts.succes('Clé d’envoi oubliée');
  }

  return (
    <div className="bo-pile">
      <h2 className="bo-groupe-titre">Connexion à l’envoi</h2>
      <Carte titre="Clé d’envoi">
        <div className="bo-pile">
          {presente ? (
            <Badge ton="ok" icone="coche">
              Clé enregistrée sur cet ordinateur
            </Badge>
          ) : (
            <Badge ton="attention" icone="alerte">
              Clé manquante
            </Badge>
          )}
          <p>
            {presente
              ? 'Les e-mails aux clients peuvent partir depuis cet ordinateur.'
              : 'Sans la clé, les e-mails aux clients ne peuvent pas partir depuis cet ordinateur.'}
          </p>
          <div className="bo-rangee">
            <Bouton variante="primaire" onClick={() => void saisir()}>
              Saisir la clé
            </Bouton>
            {presente ? (
              <Bouton variante="secondaire" onClick={oublierLaCle}>
                Oublier la clé
              </Bouton>
            ) : null}
          </div>
        </div>
      </Carte>
    </div>
  );
}
