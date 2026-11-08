/**
 * Les 4 vues de la liste des dossiers (4.2) : « En cours » est la vue par
 * défaut, jamais vide tant qu'il existe du travail. Fonctions pures, sans React.
 */
import { PHASES_DEVIS, PHASES_EXPEDITION, estTermine, phaseDe } from '../../domaine/phases';
import type { Dossier } from '../../domaine/types';
import type { VueDossiers } from '../../domaine/contrats';

export const VUES: { id: VueDossiers; libelle: string; vide: { titre: string; phrase: string } }[] = [
  {
    id: 'enCours',
    libelle: 'En cours',
    vide: { titre: 'Aucun dossier en cours', phrase: 'Les nouvelles demandes du site apparaissent ici.' },
  },
  {
    id: 'devis',
    libelle: 'Devis',
    vide: { titre: 'Aucun devis en attente', phrase: 'Les nouvelles demandes du site apparaissent ici.' },
  },
  {
    id: 'expeditions',
    libelle: 'Expéditions',
    vide: { titre: 'Aucune expédition en cours', phrase: 'Un devis accepté devient une expédition ici.' },
  },
  {
    id: 'termines',
    libelle: 'Terminés',
    vide: { titre: 'Aucun dossier terminé', phrase: 'Les dossiers livrés, annulés ou sans suite se rangent ici.' },
  },
];

export function estDansVue(dossier: Dossier, vue: VueDossiers): boolean {
  const phase = phaseDe(dossier);
  switch (vue) {
    case 'enCours':
      return !estTermine(phase);
    case 'devis':
      return PHASES_DEVIS.includes(phase);
    case 'expeditions':
      return PHASES_EXPEDITION.includes(phase);
    case 'termines':
      return estTermine(phase);
  }
}

export function compterParVue(dossiers: Dossier[]): Record<VueDossiers, number> {
  const compte: Record<VueDossiers, number> = { enCours: 0, devis: 0, expeditions: 0, termines: 0 };
  for (const d of dossiers) {
    for (const v of VUES) if (estDansVue(d, v.id)) compte[v.id] += 1;
  }
  return compte;
}

export function estVueValide(texte: string | null | undefined): texte is VueDossiers {
  return VUES.some((v) => v.id === texte);
}
