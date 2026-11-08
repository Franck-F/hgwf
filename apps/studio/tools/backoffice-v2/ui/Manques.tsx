/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Liste « Il manque : » affichée à côté du bouton qu'elle explique (jamais dans
 * une infobulle). Vide, elle ne rend rien : une seule instance par bloc.
 */
import type { ReactElement } from 'react';
import { Icone } from './icones';
import type { ManquesProps } from './types';

export function Manques({ manques, id }: ManquesProps): ReactElement | null {
  if (manques.length === 0) return null;
  return (
    <div className="bo-manques" id={id}>
      <span className="bo-manques-icone">
        <Icone nom="alerte" />
      </span>
      <div>
        <p className="bo-manques-titre">Il manque :</p>
        <ul className="bo-manques-liste">
          {manques.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
