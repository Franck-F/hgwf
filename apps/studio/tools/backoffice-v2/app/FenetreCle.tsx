/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Fenêtre « Clé d'envoi » (4.9) : remplace `window.prompt`. Ouverte au premier
 * envoi, sur réponse 401, ou depuis Outils. La clé est saisie masquée et n'est
 * jamais réaffichée après l'enregistrement.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { ecrireCle } from '../actions/cleApi';
import { Bouton, Champ, Modale } from '../ui';

export interface FenetreCleProps {
  /** `true` si une clé a été enregistrée, `false` si l'utilisateur a renoncé. */
  onTermine: (enregistree: boolean) => void;
}

/** Enregistre sans jamais lever d'exception (le stockage peut être bloqué). */
function enregistrer(cle: string): boolean {
  try {
    return ecrireCle(cle);
  } catch {
    return false;
  }
}

export function FenetreCle({ onTermine }: FenetreCleProps): ReactElement {
  const [valeur, setValeur] = useState('');
  const [erreur, setErreur] = useState<string | undefined>();

  function valider(): void {
    const cle = valeur.trim();
    if (cle === '') {
      setErreur('Saisissez la clé');
      return;
    }
    if (!enregistrer(cle)) {
      setErreur('La clé n’a pas pu être enregistrée sur cet ordinateur (navigation privée ?)');
      return;
    }
    onTermine(true);
  }

  return (
    <Modale
      titre="Clé d'envoi"
      onFermer={() => onTermine(false)}
      empecherFermeture={valeur !== ''}
      pied={
        <>
          <Bouton variante="discret" onClick={() => onTermine(false)}>
            Annuler
          </Bouton>
          <Bouton variante="primaire" onClick={valider}>
            Enregistrer
          </Bouton>
        </>
      }
    >
      <p>Pour envoyer des e-mails depuis l’outil, saisissez la clé fournie par Franck.</p>
      <Champ etiquette="Clé d'envoi" requis erreur={erreur}>
        <input
          className="bo-saisie"
          type="password"
          autoComplete="off"
          spellCheck={false}
          aria-label="Clé d'envoi"
          aria-invalid={erreur ? true : undefined}
          value={valeur}
          onChange={(e) => {
            setValeur(e.target.value);
            setErreur(undefined);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              valider();
            }
          }}
        />
      </Champ>
    </Modale>
  );
}
