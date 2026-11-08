/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Une ligne de la liste des dossiers (4.2) : Client (nom en gras, référence et
 * « Groupage maritime · 8 m³ » dessous), Phase (badge + alerte d'âge en clair),
 * Montant TTC, Dernière activité, Prochaine action. Sur mobile, la feuille de
 * style transforme la ligne en carte.
 *
 * Toute la ligne est cliquable à la souris ; le bouton du nom donne l'accès au
 * clavier et aux lecteurs d'écran (une seule cible de tabulation par ligne).
 */
import type { ReactElement } from 'react';
import { calculerChiffrage, euros } from '../../domaine/chiffrage';
import { classer } from '../../domaine/classement';
import { ilYa } from '../../domaine/format';
import { LIBELLES_PHASE, TON_PHASE, phaseDe } from '../../domaine/phases';
import { derniereActivite, prochaineActionTexte } from '../../domaine/priorites';
import type { Demande, Dossier } from '../../domaine/types';
import { Badge } from '../../ui';

export interface LigneDossierProps {
  dossier: Dossier;
  onOuvrir: (dossierId: string) => void;
  /** Horloge injectable pour les tests ; sinon l'heure courante (fixée par le harnais). */
  maintenant?: Date;
}

/** Montant TTC calculé ; l'ancien montant texte est affiché tel quel, jamais converti. */
export function montantTTC(demande: Demande | undefined): string {
  if (!demande) return '';
  const c = calculerChiffrage(demande.montantHT, demande.tauxTVA);
  if (c) return euros(c.ttc);
  const ancien = typeof demande.montantDevis === 'string' ? demande.montantDevis.trim() : '';
  return ancien;
}

/** « Groupage maritime · 8 m³ » : ce qui distingue ce dossier d'un autre du même client. */
export function resumeDossier(dossier: Dossier): string {
  const d = dossier.demande;
  const x = dossier.expedition;
  const volume = d?.volume?.trim() || (x?.colisVolume !== undefined ? `${x.colisVolume} m³` : '');
  const type = d?.typeEnvoi?.trim() || x?.mode?.trim() || '';
  return [type, volume].filter(Boolean).join(' · ');
}

export function LigneDossier({ dossier, onOuvrir, maintenant }: LigneDossierProps): ReactElement {
  const now = maintenant ?? new Date();
  const phase = phaseDe(dossier);
  const client = dossier.demande?.clientNom?.trim() || dossier.expedition?.clientNom?.trim() || 'Client sans nom';
  // Référence de la demande, puis celle de l'expédition en second plan (3.1).
  const reference = [dossier.demande?.reference, dossier.expedition?.reference]
    .filter((r, i, tout): r is string => Boolean(r) && tout.indexOf(r) === i)
    .join(' · ');
  const montant = montantTTC(dossier.demande);
  const activite = derniereActivite(dossier);
  const resume = resumeDossier(dossier);

  // L'alerte d'âge vient du même classement qu'« À faire » : une seule règle de retard.
  const classement = classer(dossier, now);
  const alerte = classement && 'candidat' in classement && classement.candidat.ligne.enRetard
    ? classement.candidat.ligne.raison
    : null;

  return (
    <tr onClick={() => onOuvrir(dossier.id)} className="bo-ligne-dossier">
      <td>
        <button type="button" className="bo-nom-lien" onClick={(e) => { e.stopPropagation(); onOuvrir(dossier.id); }}>
          {client}
        </button>
        {reference ? <div className="bo-secondaire">{reference}</div> : null}
        {resume ? <div className="bo-secondaire">{resume}</div> : null}
      </td>
      <td data-etiquette="Phase">
        <Badge ton={TON_PHASE[phase]} icone={alerte ? 'alerte' : undefined}>
          {LIBELLES_PHASE[phase]}
        </Badge>
        {alerte && alerte !== LIBELLES_PHASE[phase] ? <div className="bo-secondaire">{alerte}</div> : null}
      </td>
      <td data-etiquette="Montant TTC">{montant || <span className="bo-secondaire">—</span>}</td>
      <td data-etiquette="Dernière activité">{activite ? ilYa(activite, now) : <span className="bo-secondaire">—</span>}</td>
      <td data-etiquette="Prochaine action">{prochaineActionTexte(dossier)}</td>
    </tr>
  );
}
