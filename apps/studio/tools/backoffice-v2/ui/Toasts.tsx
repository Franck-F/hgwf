/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Pile de notifications. Succès : se ferme seul après 6 s (fermable). Erreur :
 * reste jusqu'à fermeture explicite. Le type porte le sens (pas de préfixe « ✓ »).
 *
 * La pile est `position: sticky` en bas du conteneur de défilement `.bo-racine`
 * (jamais `fixed`) : le coque doit la rendre en DERNIER enfant de `.bo-racine`.
 */
import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { Icone } from './icones';
import type { ToastProps, ToastsProps } from './types';

/** Délai d'auto-fermeture d'un succès, en millisecondes. */
export const DELAI_TOAST_SUCCES_MS = 6000;

function Toast({ id, type, message, onFermer }: ToastProps): ReactElement {
  useEffect(() => {
    if (type !== 'succes') return undefined;
    const minuteur = setTimeout(() => onFermer(id), DELAI_TOAST_SUCCES_MS);
    return () => clearTimeout(minuteur);
  }, [id, type, onFermer]);

  return (
    <div className={`bo-toast bo-toast--${type}`} role={type === 'erreur' ? 'alert' : 'status'}>
      <Icone nom={type === 'erreur' ? 'alerte' : 'coche'} />
      <p className="bo-toast-message">{message}</p>
      <button type="button" className="bo-toast-fermer" aria-label="Fermer ce message" onClick={() => onFermer(id)}>
        <Icone nom="croix" taille={16} />
      </button>
    </div>
  );
}

export function Toasts({ toasts, onFermer }: ToastsProps): ReactElement | null {
  if (toasts.length === 0) return null;
  return (
    <div className="bo-toasts">
      <div className="bo-toasts-pile">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onFermer={onFermer} />
        ))}
      </div>
    </div>
  );
}
