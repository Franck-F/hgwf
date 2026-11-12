/**
 * Sous-dossiers de la page Dossier : la page est rangée comme un dossier
 * papier, avec un intercalaire par sujet (infos, échanges, devis, expédition,
 * facturation, historique). Un seul est ouvert à la fois.
 *
 * Fonctions pures : liste des sous-dossiers présents, résumé d'une ligne de
 * chacun (ce qu'il contient, sans l'ouvrir), sous-dossier ouvert à l'arrivée
 * selon la phase.
 */
import { euros } from '../../domaine/chiffrage';
import { estNonLu } from '../../domaine/echanges';
import { fusionner } from '../../domaine/fusion';
import { construireHistorique } from '../../domaine/historique';
import { manquesFacturation } from '../../domaine/manques';
import { LIBELLES_PHASE } from '../../domaine/phases';
import { ETAPES_EXPEDITION } from '../../domaine/statuts';
import type { Brouillon, Dossier, Phase } from '../../domaine/types';
import type { IconeNom } from '../../ui/types';
import type { NomSection } from './ContexteDossier';

export type IdSousDossier = 'infos' | 'echanges' | 'devis' | 'expedition' | 'facturation' | 'historique';

export interface SousDossier {
  id: IdSousDossier;
  titre: string;
  icone: IconeNom;
  /** Une ligne : ce que contient le sous-dossier, sans l'ouvrir. */
  detail: string;
  /** Pastille orange (réponses non lues) : il y a quelque chose à lire dedans. */
  signal?: string;
}

const PHASES_DEVIS: Phase[] = ['aChiffrer', 'reponseRecue', 'devisPartiStatutACorriger', 'devisEnvoye', 'devisHorsOutil'];
const PHASES_EXPEDITION: Phase[] = ['accepte', 'aPreparer', 'pret', 'enRoute', 'incident'];

const pluriel = (n: number, mot: string): string => `${n} ${mot}${n > 1 ? 's' : ''}`;

/** Nombre lu dans un champ (le brouillon l'emporte) ; `null` s'il est vide ou illisible. */
function nombre(valeur: unknown): number | null {
  if (typeof valeur === 'number' && Number.isFinite(valeur)) return valeur;
  if (typeof valeur === 'string' && valeur.trim() !== '') {
    const n = Number(valeur.replace(',', '.').replace(/\s/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Sous-dossier qui porte une section de la page (« demande » est rangée dans « Infos »). */
export function sousDossierDeSection(nom: NomSection): IdSousDossier {
  return nom === 'demande' ? 'infos' : nom;
}

/** Les sous-dossiers présents dans ce dossier, dans l'ordre d'un dossier papier. */
export function sousDossiersDe(dossier: Dossier, brouillon: Brouillon, phase: Phase): SousDossier[] {
  const d = dossier.demande ? fusionner(dossier.demande, brouillon) : undefined;
  const x = dossier.expedition;
  const liste: SousDossier[] = [];

  const infos = d
    ? [d.typeEnvoi, d.destination, d.volume].filter(Boolean).join(' · ') || 'Demande du client'
    : x?.trajet || 'Expédition sans demande';
  liste.push({ id: 'infos', titre: 'Infos', icone: 'info', detail: infos });

  const echanges = dossier.echanges ?? [];
  const nonLus = echanges.filter(estNonLu).length;
  liste.push({
    id: 'echanges',
    titre: 'Échanges',
    icone: 'enveloppe',
    detail: echanges.length === 0 ? 'Aucun e-mail reçu' : `${pluriel(echanges.length, 'e-mail')} reçu${echanges.length > 1 ? 's' : ''}`,
    signal: nonLus > 0 ? `${nonLus} non lu${nonLus > 1 ? 's' : ''}` : undefined,
  });

  if (d && phase !== 'nouvelle') {
    const ht = nombre(d.montantHT);
    const envoye = Boolean(d.devisEnvoyeLe || d.devisEnvoyeHorsOutilLe || (d.statut ?? 0) >= 2);
    const montant = ht !== null ? `${euros(ht)} HT` : d.montantDevis?.trim() || '';
    const detail = montant ? `${montant}${envoye ? ' · envoyé' : ''}` : envoye ? 'Envoyé' : 'Pas encore chiffré';
    liste.push({ id: 'devis', titre: 'Devis', icone: 'euro', detail });
  }

  if (x) {
    const etape = typeof x.etape === 'number' ? ETAPES_EXPEDITION[x.etape] : undefined;
    liste.push({ id: 'expedition', titre: 'Expédition', icone: 'camion', detail: etape ? `Suivi : ${etape}` : LIBELLES_PHASE[phase] });
  }

  if (d) {
    const manques = manquesFacturation(d).length;
    liste.push({
      id: 'facturation',
      titre: 'Facturation',
      icone: 'facture',
      detail: manques === 0 ? 'Complète' : `À compléter (${pluriel(manques, 'champ')})`,
    });
  }

  const evenements = construireHistorique(dossier).length;
  liste.push({
    id: 'historique',
    titre: 'Historique',
    icone: 'horloge',
    detail: evenements === 0 ? 'Rien d’enregistré' : pluriel(evenements, 'événement'),
  });

  return liste;
}

/**
 * Sous-dossier ouvert à l'arrivée : les e-mails s'il y a une réponse à lire,
 * sinon celui de la phase (devis à chiffrer ou envoyé, expédition en cours),
 * sinon les infos.
 */
export function sousDossierParDefaut(phase: Phase, liste: readonly SousDossier[]): IdSousDossier {
  const present = (id: IdSousDossier): boolean => liste.some((s) => s.id === id);
  if (liste.some((s) => s.id === 'echanges' && s.signal)) return 'echanges';
  if (PHASES_DEVIS.includes(phase) && present('devis')) return 'devis';
  if (PHASES_EXPEDITION.includes(phase) && present('expedition')) return 'expedition';
  return 'infos';
}
