/**
 * Fabriques de documents pour les tests du domaine. Horloge de référence du
 * harnais : 06/11/2026 à 09h00 (un vendredi).
 */
import type { Demande, Dossier, Expedition } from '../../domaine/types';

export const MAINTENANT = new Date(2026, 10, 6, 9, 0);

export function demande(extra: Partial<Demande> = {}): Demande {
  return {
    _id: 'demande-1',
    _rev: 'r1',
    _type: 'demandeDevis',
    reference: 'DEV-2611-001',
    clientNom: 'Martin Dupont',
    email: 'martin@example.fr',
    statut: 0,
    recueLe: '05/11/2026 à 10h00',
    ...extra,
  };
}

export function expedition(extra: Partial<Expedition> = {}): Expedition {
  return {
    _id: 'expedition-1',
    _rev: 'x1',
    _type: 'expedition',
    reference: 'EXP-2610-001',
    clientNom: 'Martin Dupont',
    statutPriseEnCharge: 0,
    etape: 0,
    ...extra,
  };
}

export function dossierDemande(extra: Partial<Demande> = {}, id = 'demande-1'): Dossier {
  return { id, demande: demande({ _id: id, ...extra }) };
}

export function dossierExpedition(
  extra: Partial<Expedition> = {},
  extraDemande: Partial<Demande> | null = { statut: 4 },
): Dossier {
  const x = expedition(extra);
  if (extraDemande === null) return { id: x._id, expedition: x };
  return { id: 'demande-1', demande: demande(extraDemande), expedition: x };
}
