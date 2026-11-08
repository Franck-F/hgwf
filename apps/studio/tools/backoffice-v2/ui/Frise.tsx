/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Frise horizontale (phase du dossier ou étapes du suivi client). Liste ordonnée
 * accessible : l'étape courante porte `aria-current="step"` et un mot caché
 * pour les lecteurs d'écran ; les étapes passées ont une coche (jamais la
 * couleur seule).
 */
import type { ReactElement } from 'react';
import { Icone } from './icones';
import type { FriseProps } from './types';

export function Frise({ etapes, courante, ton = 'normal' }: FriseProps): ReactElement {
  const position = courante === null ? -1 : etapes.findIndex((e) => e.id === courante);
  return (
    <ol className={`bo-frise bo-frise--${ton}`}>
      {etapes.map((etape, i) => {
        const etat = i < position ? 'faite' : i === position ? 'courante' : 'a-venir';
        return (
          <li
            key={etape.id}
            className={`bo-frise-etape bo-frise-etape--${etat}`}
            aria-current={etat === 'courante' ? 'step' : undefined}
          >
            <span className="bo-frise-point">
              {etat === 'faite' ? <Icone nom="coche" taille={12} /> : null}
            </span>
            <span className="bo-frise-libelle">{etape.libelle}</span>
            {etat === 'courante' ? <span className="bo-sr">, étape actuelle</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
