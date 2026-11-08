/** @jsxRuntime automatic @jsxImportSource react */
/** Bandeau d'erreur de lecture commun aux onglets d'Outils : un seul bouton « Réessayer ». */
import type { ReactElement } from 'react';
import { Bouton, Icone } from '../../ui';

export function BandeauErreur({ message, onReessayer }: { message: string; onReessayer: () => void }): ReactElement {
  return (
    <div className="bo-bandeau bo-bandeau--urgent" role="alert">
      <Icone nom="alerte" />
      <span>{message}</span>
      <span className="bo-espace">
        <Bouton variante="secondaire" onClick={onReessayer}>
          Réessayer
        </Bouton>
      </span>
    </div>
  );
}
