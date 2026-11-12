/**
 * Compléments demandés au client : règles pures partagées par le classement,
 * les phases, l'action principale, le menu et les écritures.
 *
 * Une demande de compléments est tracée de deux façons :
 * - depuis l'outil : `complementDemandeLe` (date) ;
 * - hors de l'outil (Outlook…) : `complementDemandeHorsOutil` (moyen), avec ou
 *   sans date. Les anciens dossiers n'ont que le moyen : la date est alors
 *   inconnue, le dossier attend le client mais n'est JAMAIS relancé
 *   automatiquement (on n'invente pas une ancienneté).
 */
import { derniereReponse } from './echanges';
import { ageOuvreJours, lireDate, SEUIL_COMPLEMENT_RELANCE_J } from './echeances';
import type { Demande, Dossier, MoyenHorsOutil } from './types';

/** Moyens proposés, dans l'ordre d'affichage (« E-mail (Outlook) » en premier). */
export const MOYENS_HORS_OUTIL: { valeur: MoyenHorsOutil; libelle: string }[] = [
  { valeur: 'email', libelle: 'E-mail (Outlook)' },
  { valeur: 'whatsapp', libelle: 'WhatsApp' },
  { valeur: 'emailPersonnel', libelle: 'E-mail personnel' },
  { valeur: 'mainPropre', libelle: 'Remis en main propre' },
  { valeur: 'autre', libelle: 'Autre' },
];

export function libelleMoyen(moyen: MoyenHorsOutil | undefined): string {
  return MOYENS_HORS_OUTIL.find((m) => m.valeur === moyen)?.libelle ?? '';
}

/** Des compléments ont été demandés (par l'outil ou hors de l'outil). */
export function complementDemande(d: Demande | undefined): boolean {
  if (!d) return false;
  return Boolean(d.complementDemandeLe?.trim()) || Boolean(d.complementDemandeHorsOutil);
}

/** Date de la demande de compléments, ou `null` (jamais demandés, ou date inconnue / illisible). */
export function dateComplement(d: Demande | undefined): Date | null {
  return lireDate(d?.complementDemandeLe);
}

/** Vrai si le client a répondu après la demande de compléments. */
export function reponseApresComplement(dossier: Dossier): boolean {
  const reponse = derniereReponse(dossier);
  if (!reponse) return false;
  // Pas de demande, ou date inconnue ou illisible : la présence d'une réponse l'emporte (rien ne doit se perdre).
  const c = dateComplement(dossier.demande);
  if (!c) return true;
  return reponse.getTime() > c.getTime();
}

/** Les compléments sont demandés et le client n'a pas répondu depuis. */
export function complementEnAttente(dossier: Dossier): boolean {
  return complementDemande(dossier.demande) && !reponseApresComplement(dossier);
}

/** Au-delà du seuil de jours ouvrés sans réponse : à relancer. Date inconnue : jamais. */
export function complementARelancer(dossier: Dossier, maintenant: Date): boolean {
  const c = dateComplement(dossier.demande);
  if (!c || !complementEnAttente(dossier)) return false;
  return ageOuvreJours(c, maintenant) >= SEUIL_COMPLEMENT_RELANCE_J;
}
