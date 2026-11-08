/**
 * Chiffres du mois, calculés depuis les dossiers (4.7) : rien à saisir, rien
 * d'écrit. Remplace `statsMensuelles`, qui n'était ni lue ni alimentée.
 *
 * Lecture par « mois de réception » : on prend les demandes reçues ce mois-là
 * et on regarde où elles en sont (devis envoyé, accepté). Cela fonctionne sur
 * les anciens documents, qui n'ont pas les champs de trace ajoutés par la V2
 * (date d'acceptation, par exemple), alors qu'un décompte « par date de
 * l'événement » les compterait pour zéro.
 */
import { lireDate } from '../../domaine/echeances';
import { lireVolume } from '../../domaine/format';
import { DEMANDE } from '../../domaine/statuts';
import type { Demande, Dossier, Expedition } from '../../domaine/types';

export interface ChiffresMois {
  recues: number;
  devisEnvoyes: number;
  acceptes: number;
  /** Part des devis envoyés qui ont été acceptés, en % entier ; `null` sans devis. */
  tauxAcceptation: number | null;
  /** Somme des m³ des expéditions créées dans le mois. */
  volumeM3: number;
}

export interface OptionMois {
  /** « 2026-11 ». */
  id: string;
  libelle: string;
}

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export const idMois = (annee: number, mois: number): string => `${annee}-${String(mois + 1).padStart(2, '0')}`;

/** Les `n` derniers mois, le plus récent d'abord (mois courant compris). */
export function moisDisponibles(maintenant: Date, n = 12): OptionMois[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
    return { id: idMois(d.getFullYear(), d.getMonth()), libelle: `${MOIS[d.getMonth()]} ${d.getFullYear()}` };
  });
}

function dateReception(d: Demande): Date | null {
  return lireDate(d.recueLe) ?? (d._createdAt ? new Date(d._createdAt) : null);
}

function dansLeMois(date: Date | null, id: string): boolean {
  return date !== null && !Number.isNaN(date.getTime()) && idMois(date.getFullYear(), date.getMonth()) === id;
}

const devisEnvoye = (d: Demande): boolean =>
  Boolean(d.devisEnvoyeLe || d.devisEnvoyeHorsOutilLe) ||
  d.statut === DEMANDE.devisEnvoye ||
  d.statut === DEMANDE.acceptee ||
  d.statut === DEMANDE.convertie;

const accepte = (d: Demande): boolean =>
  d.statut === DEMANDE.acceptee || d.statut === DEMANDE.convertie || Boolean(d.acceptationLe);

function dateCreationExpedition(x: Expedition, demande: Demande | undefined): Date | null {
  if (x._createdAt) return new Date(x._createdAt);
  return demande ? dateReception(demande) : null;
}

function volumeExpedition(x: Expedition, demande: Demande | undefined): number {
  if (typeof x.colisVolume === 'number' && Number.isFinite(x.colisVolume)) return x.colisVolume;
  return lireVolume(demande?.volume) ?? 0;
}

/** `id` = « AAAA-MM » (voir `moisDisponibles`). */
export function chiffresDuMois(dossiers: Dossier[], id: string): ChiffresMois {
  let recues = 0;
  let devisEnvoyes = 0;
  let acceptes = 0;
  let volume = 0;
  for (const d of dossiers) {
    if (d.demande && dansLeMois(dateReception(d.demande), id)) {
      recues += 1;
      if (devisEnvoye(d.demande)) devisEnvoyes += 1;
      if (accepte(d.demande)) acceptes += 1;
    }
    if (d.expedition && dansLeMois(dateCreationExpedition(d.expedition, d.demande), id)) {
      volume += volumeExpedition(d.expedition, d.demande);
    }
  }
  const taux = devisEnvoyes > 0 ? Math.min(100, Math.round((acceptes / devisEnvoyes) * 100)) : null;
  return { recues, devisEnvoyes, acceptes, tauxAcceptation: taux, volumeM3: Math.round(volume * 100) / 100 };
}
