/**
 * Règles de l'accueil « À faire » (spécification 4.1) : groupes, ordre,
 * attente, tri d'urgence de la liste des dossiers.
 *
 * Principe : aucun dossier vivant ne peut disparaître d'« À faire » sans qu'un
 * geste explicite l'ait fait avancer. Un dossier est soit dans un groupe, soit
 * dans « En attente » avec la raison de l'attente ; seuls les dossiers clos
 * (livré, annulé, sans suite) n'apparaissent nulle part. Le classement d'un
 * dossier est dans `classement.ts` (limite de 300 lignes par fichier).
 */
import { actionPrincipale } from './actionPrincipale';
import { classer, comparer, type Attente, type Candidat, type Classement } from './classement';
import type { ResultatUseAFaire } from './contrats';
import { lireDate } from './echeances';
import { estTermine, phaseDe } from './phases';
import { prochaineRotation } from './suggestions';
import type { Dossier, GroupeAFaire, IdGroupeAFaire, LigneAttente, Rotation } from './types';

const TITRES: Record<IdGroupeAFaire, string> = {
  aOuvrir: 'Demandes à ouvrir',
  devis: 'Devis à chiffrer, envoyer ou conclure',
  sansReponse: 'Devis sans réponse',
  expeditions: 'Expéditions',
};

const ORDRE_GROUPES: IdGroupeAFaire[] = ['aOuvrir', 'devis', 'sansReponse', 'expeditions'];

/** Calcule groupes, « En attente », prochaine clôture et nombre d'urgences. */
export function calculerAFaire(
  dossiers: Dossier[],
  rotations: Rotation[],
  maintenant: Date,
): Omit<ResultatUseAFaire, 'chargement' | 'erreur'> {
  const candidats: Candidat[] = [];
  const attentes: Attente[] = [];
  for (const d of dossiers) {
    const c = classer(d, maintenant);
    if (!c) continue;
    if ('candidat' in c) candidats.push(c.candidat);
    else attentes.push(c.attente);
  }

  const groupes: GroupeAFaire[] = [];
  for (const id of ORDRE_GROUPES) {
    const lignes = candidats
      .filter((c) => c.groupe === id)
      .sort(comparer)
      .map((c) => c.ligne);
    if (lignes.length > 0) groupes.push({ id, titre: TITRES[id], lignes });
  }

  const attente: LigneAttente[] = attentes
    .sort((a, b) => a.depuis.getTime() - b.depuis.getTime())
    .map((a) => ({ ...a.ligne, attente: a.attente }));

  const nbUrgents = groupes.reduce((n, g) => n + g.lignes.filter((l) => l.enRetard).length, 0);
  return { groupes, attente, prochaineCloture: prochaineRotation(rotations, maintenant), nbUrgents };
}

/** Texte de la colonne « Prochaine action » de la liste. */
export function prochaineActionTexte(dossier: Dossier): string {
  return actionPrincipale(dossier, {}).libelle;
}

/** Date de dernière activité d'un dossier (pour « Dernière activité »). */
export function derniereActivite(dossier: Dossier): Date | null {
  const d = dossier.demande;
  const x = dossier.expedition;
  const textes = [
    d?._updatedAt,
    x?._updatedAt,
    d?.recueLe,
    d?.accuseReceptionLe,
    d?.complementDemandeLe,
    d?.reponseClientLe,
    d?.devisEnvoyeLe,
    d?.devisEnvoyeHorsOutilLe,
    d?.relanceEnvoyeeLe,
    d?.acceptationLe,
    x?.priseEnChargeLe,
    x?.derniereNotificationLe,
    x?.reglementRecuLe,
    x?.derogationLe,
    d?._createdAt,
    x?._createdAt,
  ];
  let max: Date | null = null;
  for (const t of textes) {
    const date = lireDate(t);
    if (date && (!max || date.getTime() > max.getTime())) max = date;
  }
  return max;
}

/**
 * Tri de la liste des dossiers : urgence (mêmes règles qu'« À faire »), puis
 * activité récente. Ordre : groupes d'« À faire » dans l'ordre, puis « En
 * attente », puis les dossiers clos.
 */
export function trierParUrgence(dossiers: Dossier[], maintenant: Date): Dossier[] {
  const rang = new Map<string, number>();
  const classements = new Map<string, Classement>();
  for (const d of dossiers) classements.set(d.id, classer(d, maintenant));

  // L'ordre d'« À faire » est reproduit à partir des mêmes candidats.
  const candidats: Candidat[] = [];
  for (const d of dossiers) {
    const c = classements.get(d.id);
    if (c && 'candidat' in c) candidats.push(c.candidat);
  }
  let position = 0;
  for (const id of ORDRE_GROUPES) {
    for (const c of candidats.filter((x) => x.groupe === id).sort(comparer)) {
      rang.set(c.ligne.dossierId, position);
      position += 1;
    }
  }
  const rangDe = (d: Dossier): number => {
    const r = rang.get(d.id);
    if (r !== undefined) return r;
    return estTermine(phaseDe(d)) ? 2_000_000 : 1_000_000;
  };

  return [...dossiers].sort((a, b) => {
    const diff = rangDe(a) - rangDe(b);
    if (diff !== 0) return diff;
    const ta = derniereActivite(a)?.getTime() ?? 0;
    const tb = derniereActivite(b)?.getTime() ?? 0;
    return tb - ta;
  });
}
