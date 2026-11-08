/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Une ligne de l'accueil « À faire » (4.1) : un `<button>` entier cliquable
 * (client en gras, raison, âge, libellé de l'action du dossier en fin de ligne).
 *
 * Cliquer ouvre le dossier : aucune écriture depuis l'accueil, une seule
 * façon de faire une action (dans le dossier). Le libellé d'action est donc un
 * simple texte de fin de ligne, pas un second bouton imbriqué ; il n'est
 * « plein » que sur la première ligne de l'écran (un seul bouton plein par écran).
 */
import type { ReactElement } from 'react';
import type { LigneAFaireProps } from '../../domaine/contrats';
import { Badge, LigneCliquable } from '../../ui';

/**
 * « en attente depuis 3 jours » : le libellé dit de quelle durée il s'agit (depuis
 * la date qui a mis le dossier dans « À faire »), pour ne pas être pris pour la
 * « dernière activité » de la liste ou l'ancienneté de la demande du dossier.
 */
export function texteAge(jours: number): string {
  if (jours <= 0) return "en attente depuis aujourd'hui";
  if (jours === 1) return 'en attente depuis hier';
  return `en attente depuis ${jours} jours`;
}

/** Vrai si la raison dit déjà l'âge : on ne le répète pas. */
function raisonDitLAge(raison: string): boolean {
  return /il y a \d+ jours?|hier|aujourd'hui/i.test(raison);
}

export interface LigneAFaireVueProps extends LigneAFaireProps {
  /** Grise la ligne (dossier qui vient de sortir de la liste, reste 2 s). */
  attenuee?: boolean;
}

export function LigneAFaire({ ligne, principale, onOuvrir, attenuee }: LigneAFaireVueProps): ReactElement {
  return (
    <LigneCliquable onClick={() => onOuvrir(ligne.dossierId)} attenuee={attenuee}>
      <span className="bo-fort">{ligne.client}</span>
      {ligne.reference ? <span className="bo-secondaire">{ligne.reference}</span> : null}
      {ligne.enRetard ? (
        <Badge ton="urgent" icone="alerte">
          En retard
        </Badge>
      ) : null}
      <span>{ligne.raison}</span>
      {raisonDitLAge(ligne.raison) ? null : <span className="bo-secondaire">{texteAge(ligne.ageJours)}</span>}
      <span
        className={principale ? 'bo-bouton bo-bouton--primaire bo-bouton--s bo-espace' : 'bo-lien bo-espace'}
        data-action="ligne"
      >
        {ligne.actionLibelle}
      </span>
    </LigneCliquable>
  );
}
