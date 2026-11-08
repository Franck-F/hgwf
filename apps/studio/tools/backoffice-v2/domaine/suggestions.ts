/**
 * Aides déterministes du devis (4.3) : jamais écrites d'office, aucun prix
 * inventé, aucun appel d'IA. Le seul montant proposé vient de la grille de la
 * fiche service ; sans prix renseigné ou sans volume lisible, rien n'est
 * proposé.
 */
import { debutDeJour } from './echeances';
import { formaterJourMois, lireDatesRotation, lireVolume } from './format';
import type { Demande, Fiche, ProchaineCloture, Rotation } from './types';

export interface PropositionGrille {
  montantHT: number;
  /** « 8 m³ × 400 € = 3 200 € HT » : le détail du calcul est montré. */
  detail: string;
}

export interface PropositionDelai {
  /** « Prochaine clôture le 14/11, départ le 18/11 ». */
  texte: string;
}

const NBSP = ' ';

/** « 3 200 € » (sans décimales inutiles), espace insécable pour ne pas couper le montant. */
function eurosCourts(n: number): string {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })
    .format(n)
    .replace(/[  ]/g, NBSP)}${NBSP}€`;
}

const nombreCourt = (n: number) => String(n).replace('.', ',');

/** Une ligne de grille au mètre cube. */
const estLigneM3 = (unite: string | undefined) => /m\s?[³3]/i.test(unite ?? '');

/**
 * `null` si la fiche n'a pas de prix de grille au m³, si plusieurs lignes au
 * m³ se disputent (ambigu : on n'invente pas) ou si le volume est illisible.
 */
export function appliquerGrille(demande: Demande, fiche: Fiche | null): PropositionGrille | null {
  if (!fiche) return null;
  const volume = lireVolume(demande.volume);
  if (volume === null) return null;
  const lignes = (fiche.grille ?? []).filter(
    (l) => estLigneM3(l.unite) && typeof l.prixHT === 'number' && Number.isFinite(l.prixHT) && l.prixHT > 0,
  );
  const ligne = lignes.length === 1 ? lignes[0] : undefined;
  if (!ligne || typeof ligne.prixHT !== 'number') return null;
  const montantHT = Math.round(volume * ligne.prixHT * 100) / 100;
  return {
    montantHT,
    detail: `${nombreCourt(volume)}${NBSP}m³ × ${eurosCourts(ligne.prixHT)} = ${eurosCourts(montantHT)} HT`,
  };
}

/** Rotation à venir la plus proche (clôture non passée), ou `null`. */
export function prochaineRotation(rotations: Rotation[], aujourdhui: Date): ProchaineCloture | null {
  const base = debutDeJour(aujourdhui).getTime();
  let meilleure: ProchaineCloture | null = null;
  for (const r of rotations) {
    const { cloture, depart } = lireDatesRotation(r, aujourdhui);
    if (!cloture || cloture.getTime() < base) continue;
    if (!meilleure || cloture.getTime() < meilleure.cloture.getTime()) {
      meilleure = { rotationId: r._id, nom: r.nom ?? '', cloture, depart };
    }
  }
  return meilleure;
}

/** `null` s'il n'y a pas de rotation à venir. */
export function proposerDelai(rotations: Rotation[], aujourdhui: Date): PropositionDelai | null {
  const p = prochaineRotation(rotations, aujourdhui);
  if (!p) return null;
  const texte = p.depart
    ? `Prochaine clôture le ${formaterJourMois(p.cloture)}, départ le ${formaterJourMois(p.depart)}`
    : `Prochaine clôture le ${formaterJourMois(p.cloture)}`;
  return { texte };
}
