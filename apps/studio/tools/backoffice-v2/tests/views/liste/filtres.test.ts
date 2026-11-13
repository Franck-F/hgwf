/**
 * Filtres de la liste des dossiers : étape précise, type d'envoi, texte libre.
 */
import { describe, expect, it } from 'vitest';
import {
  FILTRES_VIDES,
  etapeDe,
  etapesPresentes,
  filtrer,
  filtresActifs,
  normaliser,
  trier,
  typesEnvoiPresents,
} from '../../../views/Dossiers/filtres';
import { dossierDemande } from '../../domaine/fabrique';

const nouvelle = dossierDemande({ statut: 0, clientNom: 'Société Lomé Export', destination: 'Lomé (Togo)', typeEnvoi: 'Groupage maritime' }, 'a');
const attente = dossierDemande(
  { statut: 1, clientNom: 'Martin Dupont', destination: 'Dakar', typeEnvoi: 'Conteneur complet', complementDemandeLe: '02/11/2026 à 10h00' },
  'b',
);
const aChiffrer = dossierDemande({ statut: 1, clientNom: 'Awa Diallo', destination: 'Abidjan', typeEnvoi: 'groupage maritime ' }, 'c');
const envoye = dossierDemande({ statut: 2, devisEnvoyeLe: '05/11/2026 à 10h00', reference: 'HGWF-2026-7216', typeEnvoi: 'Fret aérien' }, 'd');
const tous = [nouvelle, attente, aChiffrer, envoye];

describe('etapeDe', () => {
  it('distingue « En attente du client » de « À chiffrer »', () => {
    expect(etapeDe(attente)).toBe('complements');
    expect(etapeDe(aChiffrer)).toBe('aChiffrer');
    expect(etapeDe(nouvelle)).toBe('nouvelle');
    expect(etapeDe(envoye)).toBe('devisEnvoye');
  });
});

describe('filtrer', () => {
  it('sans filtre, tout passe', () => {
    expect(filtrer(tous, FILTRES_VIDES)).toHaveLength(4);
    expect(filtresActifs(FILTRES_VIDES)).toBe(false);
  });

  it('texte : sans accents ni casse, chaque mot doit se trouver', () => {
    expect(filtrer(tous, { ...FILTRES_VIDES, texte: 'lome' }).map((d) => d.id)).toEqual(['a']);
    expect(filtrer(tous, { ...FILTRES_VIDES, texte: 'DUPONT dakar' }).map((d) => d.id)).toEqual(['b']);
    expect(filtrer(tous, { ...FILTRES_VIDES, texte: 'dupont abidjan' })).toHaveLength(0);
    expect(filtrer(tous, { ...FILTRES_VIDES, texte: '7216' }).map((d) => d.id)).toEqual(['d']);
  });

  it('étape et type d’envoi (écritures voisines regroupées)', () => {
    expect(filtrer(tous, { ...FILTRES_VIDES, etape: 'complements' }).map((d) => d.id)).toEqual(['b']);
    expect(filtrer(tous, { ...FILTRES_VIDES, typeEnvoi: 'Groupage maritime' }).map((d) => d.id)).toEqual(['a', 'c']);
  });
});

describe('compteurs', () => {
  it('étapes dans l’ordre du parcours, avec leur nombre', () => {
    expect(etapesPresentes(tous).map((e) => [e.id, e.nombre])).toEqual([
      ['nouvelle', 1],
      ['aChiffrer', 1],
      ['complements', 1],
      ['devisEnvoye', 1],
    ]);
  });

  it('types d’envoi du plus fréquent au plus rare', () => {
    expect(typesEnvoiPresents(tous)[0]).toEqual({ valeur: 'Groupage maritime', nombre: 2 });
    expect(normaliser('  Fret   AÉRIEN ')).toBe('fret aerien');
  });
});

describe('trier', () => {
  const ancien = dossierDemande({ recueLe: '01/10/2026 à 09h00', _updatedAt: '2026-11-12T10:00:00Z' }, 'ancien');
  const recent = dossierDemande({ recueLe: '10/11/2026 à 09h00', _updatedAt: '2026-11-10T10:00:00Z' }, 'recent');
  const moyen = dossierDemande({ recueLe: '20/10/2026 à 09h00', _updatedAt: '2026-10-20T10:00:00Z' }, 'moyen');
  const maintenant = new Date('2026-11-13T10:00:00Z');
  it('« Plus récents » : le dernier arrivé en tête, même si un ancien vient d’être modifié', () => {
    expect(trier([ancien, moyen, recent], 'recents', maintenant).map((d) => d.id)).toEqual(['recent', 'moyen', 'ancien']);
  });
  it('« Dernière activité » : le dernier touché en tête', () => {
    expect(trier([moyen, recent, ancien], 'activite', maintenant)[0]?.id).toBe('ancien');
  });
});
