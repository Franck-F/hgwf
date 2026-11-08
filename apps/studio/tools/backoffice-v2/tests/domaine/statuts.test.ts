import { describe, expect, it } from 'vitest';
import {
  DEMANDE,
  ETAPE,
  ETAPES_EXPEDITION,
  MODES_ENVOI,
  PRISE_EN_CHARGE,
  STATUTS_CONTENEUR,
  STATUTS_DEMANDE,
  STATUTS_PRISE_EN_CHARGE,
} from '../../domaine/statuts';

/**
 * Non-régression des index : ils sont stockés en base, donc jamais réordonnés.
 * Si ce test casse, c'est qu'un schéma a changé l'ordre ou le contenu d'un
 * tableau déjà en production : corriger le schéma, pas ce test.
 */
describe('index de statuts (source unique, jamais réordonnés)', () => {
  it('STATUTS_DEMANDE', () => {
    expect([...STATUTS_DEMANDE]).toEqual([
      'Nouvelle',
      'En cours',
      'Devis envoyé',
      'Acceptée',
      'Convertie',
      'Refusée / sans suite',
    ]);
  });

  it('STATUTS_PRISE_EN_CHARGE', () => {
    expect([...STATUTS_PRISE_EN_CHARGE]).toEqual(['À préparer', 'Prêt', 'Expédié', 'Livré', 'Incident', 'Annulé']);
  });

  it('ETAPES_EXPEDITION', () => {
    expect([...ETAPES_EXPEDITION]).toEqual([
      'Pris en charge',
      'Au port du Havre',
      'En mer',
      "Port d'arrivée",
      'Livré',
    ]);
  });

  it('STATUTS_CONTENEUR', () => {
    expect([...STATUTS_CONTENEUR]).toEqual(['Disponible', 'Réservé', 'Vendu']);
  });

  it('MODES_ENVOI', () => {
    expect([...MODES_ENVOI]).toEqual([
      'Groupage maritime',
      'Conteneur complet',
      'Fret aérien',
      'Véhicule',
      'Routier',
    ]);
  });

  it('les index nommés pointent sur le bon libellé', () => {
    expect(STATUTS_DEMANDE[DEMANDE.nouvelle]).toBe('Nouvelle');
    expect(STATUTS_DEMANDE[DEMANDE.enCours]).toBe('En cours');
    expect(STATUTS_DEMANDE[DEMANDE.devisEnvoye]).toBe('Devis envoyé');
    expect(STATUTS_DEMANDE[DEMANDE.acceptee]).toBe('Acceptée');
    expect(STATUTS_DEMANDE[DEMANDE.convertie]).toBe('Convertie');
    expect(STATUTS_DEMANDE[DEMANDE.sansSuite]).toBe('Refusée / sans suite');

    expect(STATUTS_PRISE_EN_CHARGE[PRISE_EN_CHARGE.aPreparer]).toBe('À préparer');
    expect(STATUTS_PRISE_EN_CHARGE[PRISE_EN_CHARGE.pret]).toBe('Prêt');
    expect(STATUTS_PRISE_EN_CHARGE[PRISE_EN_CHARGE.expedie]).toBe('Expédié');
    expect(STATUTS_PRISE_EN_CHARGE[PRISE_EN_CHARGE.livre]).toBe('Livré');
    expect(STATUTS_PRISE_EN_CHARGE[PRISE_EN_CHARGE.incident]).toBe('Incident');
    expect(STATUTS_PRISE_EN_CHARGE[PRISE_EN_CHARGE.annule]).toBe('Annulé');

    expect(ETAPES_EXPEDITION[ETAPE.priseEnCharge]).toBe('Pris en charge');
    expect(ETAPES_EXPEDITION[ETAPE.livre]).toBe('Livré');
  });
});
