/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Bandeau « Le client a répondu » en tête de la page Dossier : le signal reste
 * visible tant qu'une réponse n'est pas lue, quelle que soit la phase du
 * dossier (un dossier plus avancé garde ses réponses non lues à portée).
 */
import type { ReactElement } from 'react';
import { nbNonLus } from '../../domaine/echanges';
import type { Dossier } from '../../domaine/types';
import { Bouton, Icone } from '../../ui';

export function BandeauReponse({ dossier, onLire }: { dossier: Dossier; onLire: () => void }): ReactElement | null {
  const n = nbNonLus(dossier);
  if (n === 0) return null;
  return (
    <div className="bo-bandeau bo-bandeau--info" role="status">
      <Icone nom="enveloppe" />
      <span>{n > 1 ? `Le client a répondu : ${n} réponses non lues.` : 'Le client a répondu : 1 réponse non lue.'}</span>
      <span className="bo-espace" />
      <Bouton variante="secondaire" taille="s" onClick={onLire}>
        Lire la réponse
      </Bouton>
    </div>
  );
}
