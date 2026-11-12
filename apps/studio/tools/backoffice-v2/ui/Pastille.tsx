/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Pastille carrée colorée devant le nom d'un dossier : reprend la couleur de la
 * phase (même ton que le badge) avec son icône. Purement décorative : le mot de
 * la phase est toujours écrit à côté, dans le badge.
 */
import type { ReactElement } from 'react';
import { Icone } from './icones';
import type { IconeNom, TonBadge } from './types';

const ICONE_TON: Record<TonBadge, IconeNom> = {
  neutre: 'dossiers',
  info: 'fleche',
  attention: 'horloge',
  urgent: 'alerte',
  ok: 'coche',
};

export function Pastille({ ton }: { ton: TonBadge }): ReactElement {
  return (
    <span className={`bo-pastille bo-pastille--${ton}`} aria-hidden="true">
      <Icone nom={ICONE_TON[ton]} taille={13} trait={2.2} />
    </span>
  );
}
