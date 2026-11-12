/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Une ligne du tableau de l'accueil « À faire » (4.1) : Client (pastille de la
 * phase, nom), Référence, « Où en est le dossier » (raison, au plus UN badge
 * « En retard », réponses non lues en clair), Depuis (âge) et UNE action.
 *
 * Cliquer la ligne ou l'action ouvre le dossier : aucune écriture depuis
 * l'accueil, une seule façon de faire une action (dans le dossier). Le nom est
 * un vrai bouton (accès clavier) ; l'action a le même style partout.
 */
import type { MouseEvent, ReactElement } from 'react';
import type { LigneAFaireProps } from '../../domaine/contrats';
import { TON_PHASE } from '../../domaine/phases';
import { Badge, Icone, Pastille } from '../../ui';

/**
 * « en attente depuis 3 jours » : le libellé dit de quelle durée il s'agit (depuis
 * la date qui a mis le dossier dans « À faire »), pour ne pas être pris pour la
 * « dernière activité » de la liste ou l'ancienneté de la demande du dossier.
 */
export function texteAge(jours: number): string {
  if (jours <= 0) return 'en attente depuis aujourd’hui';
  if (jours === 1) return 'en attente depuis hier';
  return `en attente depuis ${jours} jours`;
}

/** Colonne « Depuis » : « aujourd'hui », « hier », « 3 jours ». */
export function texteDepuis(jours: number): string {
  if (jours <= 0) return 'aujourd’hui';
  if (jours === 1) return 'hier';
  return `${jours} jours`;
}

export interface LigneAFaireVueProps extends LigneAFaireProps {
  /** Grise la ligne (dossier qui vient de sortir de la liste, reste 2 s). */
  attenuee?: boolean;
}

export function LigneAFaire({ ligne, onOuvrir, attenuee }: LigneAFaireVueProps): ReactElement {
  // Ligne mise en avant : une réponse du client attend d'être lue.
  const vive = ligne.nbNonLus > 0;
  const ouvrir = (e: MouseEvent): void => {
    e.stopPropagation();
    onOuvrir(ligne.dossierId);
  };
  return (
    <tr
      className={`bo-ligne-dossier${vive ? ' bo-ligne-dossier--vif' : ''}${attenuee ? ' bo-ligne--attenuee' : ''}`}
      onClick={() => onOuvrir(ligne.dossierId)}
    >
      <td>
        <span className="bo-nom-cellule">
          <Pastille ton={TON_PHASE[ligne.phase] ?? 'neutre'} />
          <button type="button" className="bo-nom-lien" onClick={ouvrir}>
            {ligne.client}
          </button>
        </span>
      </td>
      <td data-etiquette="Référence" className="bo-secondaire">
        {ligne.reference || '—'}
      </td>
      <td data-etiquette="Où en est le dossier">
        <span>{ligne.raison}</span>
        {ligne.enRetard ? (
          <>
            {' '}
            <Badge ton="urgent" icone="alerte">
              En retard
            </Badge>
          </>
        ) : null}
        {ligne.nbNonLus > 0 ? (
          <div className="bo-non-lus">
            <Icone nom="enveloppe" taille={14} />
            {ligne.nbNonLus > 1 ? `${ligne.nbNonLus} réponses non lues` : '1 réponse non lue'}
          </div>
        ) : null}
      </td>
      <td data-etiquette="Depuis" className="bo-secondaire" title={texteAge(ligne.ageJours)}>
        {texteDepuis(ligne.ageJours)}
      </td>
      <td className="bo-cellule-action">
        <button type="button" className="bo-action-ligne" data-action="ligne" onClick={ouvrir}>
          {ligne.actionLibelle}
          <Icone nom="chevronDroite" taille={16} />
        </button>
      </td>
    </tr>
  );
}
