/**
 * Réponses des clients (fil « Échanges ») : règles pures, sans React ni Sanity.
 *
 * Une réponse arrive par e-mail à l'adresse du dossier
 * (`dossier-<RÉFÉRENCE>@reponses.hgwf-cargo.fr`), l'API la dépose dans un
 * document `echange` et pose `reponseClientLe` sur la demande. Le signal
 * « Réponse reçue » vient de là, et s'éteint quand l'équipe a tout lu.
 */
import { lireDate } from './echeances';
import type { Demande, Dossier, Echange, Expedition } from './types';

/**
 * Domaine de réception des réponses. L'API le lit dans `REPONSES_DOMAINE` ; ici
 * il est écrit en dur, faute de variable d'environnement dans le Studio : à
 * changer aux deux endroits si le domaine change.
 */
export const DOMAINE_REPONSES = 'reponses.hgwf-cargo.fr';

/** Adresse à laquelle le client répond pour ce dossier. */
export function adresseReponse(reference: string, domaine: string = DOMAINE_REPONSES): string {
  return `dossier-${reference.trim()}@${domaine}`;
}

const cle = (t: string | undefined): string => (t ?? '').trim().toLowerCase();

/**
 * Échanges d'un dossier : liés à la demande (référence faible ou référence
 * écrite), ou à l'expédition seule par sa référence ou celle de sa demande. La
 * casse ne compte pas : l'adresse de réponse peut être passée en minuscules.
 */
export function echangesDe(
  demande: Demande | undefined,
  expedition: Expedition | undefined,
  tous: Echange[],
): Echange[] {
  const refs = new Set(
    [demande?.reference, expedition?.demandeRef, demande ? undefined : expedition?.reference]
      .map(cle)
      .filter(Boolean),
  );
  if (!demande && refs.size === 0) return [];
  return tous.filter(
    (e) => (demande !== undefined && e.demandeId === demande._id) || (cle(e.reference) !== '' && refs.has(cle(e.reference))),
  );
}

/** Date de réception d'un échange (à défaut, de création du document). */
export function dateEchange(e: Echange): Date | null {
  return lireDate(e.recuLe) ?? lireDate(e._createdAt);
}

/** Du plus récent au plus ancien : ce que l'équipe doit traiter est en haut. */
export function trierEchanges(echanges: Echange[]): Echange[] {
  const t = (e: Echange): number => dateEchange(e)?.getTime() ?? 0;
  return [...echanges].sort((a, b) => t(b) - t(a));
}

export const estNonLu = (e: Echange): boolean => e.lu !== true;

export function echangesNonLus(dossier: Dossier): Echange[] {
  return (dossier.echanges ?? []).filter(estNonLu);
}

export function nbNonLus(dossier: Dossier): number {
  return echangesNonLus(dossier).length;
}

/** Plus ancienne réception parmi les non lus : l'attente se compte depuis elle. */
export function plusAncienNonLu(dossier: Dossier): Date | null {
  let min: Date | null = null;
  for (const e of echangesNonLus(dossier)) {
    const d = dateEchange(e);
    if (d && (!min || d.getTime() < min.getTime())) min = d;
  }
  return min;
}

/**
 * Le signal « Réponse reçue » est-il encore à traiter pour ce dossier ?
 * Sans échange (réponse notée à la main par « Le client a répondu », ou échanges
 * non chargés), la trace `reponseClientLe` seule fait foi comme avant. Dès qu'il
 * y a des échanges, il reste tant qu'il en reste un non lu.
 */
export function reponseATraiter(dossier: Dossier): boolean {
  const echanges = dossier.echanges ?? [];
  return echanges.length === 0 || echanges.some(estNonLu);
}

/**
 * Message compréhensible pour le champ `erreur` d'un échange. L'API y écrit une
 * courte phrase technique ; on la garde en détail, derrière une explication.
 */
export function explicationErreurEchange(erreur: string): string {
  const detail = erreur.trim();
  const t = detail.toLowerCase();
  let cause = 'Un incident est survenu au traitement de ce message.';
  if (/pi[eè]ce|attachment|fichier|file/.test(t)) {
    cause = 'Une pièce jointe n’a pas pu être récupérée : demandez au client de la renvoyer, ou cherchez-la dans la copie reçue par l’équipe.';
  } else if (/copie|transf|forward|[ée]quipe|contact@/.test(t)) {
    cause = 'La copie pour l’équipe n’est pas partie : ce message n’est visible qu’ici.';
  } else if (/dossier|demande|r[ée]f[ée]rence/.test(t)) {
    cause = 'Ce message n’a pas pu être rattaché sûrement à une demande.';
  }
  return detail ? `${cause} (Détail : ${detail})` : cause;
}

/** « 1,2 Mo », « 340 Ko » : taille d'une pièce jointe. */
export function formaterTaille(octets: number | undefined): string {
  if (typeof octets !== 'number' || !Number.isFinite(octets) || octets < 0) return '';
  if (octets < 1000) return `${Math.round(octets)} o`;
  if (octets < 1_000_000) return `${Math.round(octets / 1000)} Ko`;
  return `${(octets / 1_000_000).toFixed(1).replace('.', ',')} Mo`;
}
