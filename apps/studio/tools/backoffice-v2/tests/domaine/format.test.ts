import { describe, expect, it } from 'vitest';
import { ageJours, ageOuvreHeures, ageOuvreJours, lireDate } from '../../domaine/echeances';
import {
  formaterDate,
  formaterDateHeure,
  formaterTelephone,
  ilYa,
  lireDateRotation,
  lireVolume,
  rotationTerminee,
} from '../../domaine/format';

const d = (a: number, m: number, j: number, h = 0, min = 0) => new Date(a, m - 1, j, h, min);

describe('lireDate', () => {
  it('lit les deux formats de l’API', () => {
    expect(lireDate('28/10/2026')).toEqual(d(2026, 10, 28));
    expect(lireDate('28/10/2026 à 14h02')).toEqual(d(2026, 10, 28, 14, 2));
  });
  it('refuse l’illisible et l’impossible', () => {
    expect(lireDate('À PLANIFIER')).toBeNull();
    expect(lireDate('31/02/2026')).toBeNull();
    expect(lireDate('')).toBeNull();
    expect(lireDate(undefined)).toBeNull();
  });
  it('lit l’ISO', () => {
    expect(lireDate('2026-10-28')).toEqual(d(2026, 10, 28));
    expect(lireDate('2026-10-28T12:00:00.000Z')?.getTime()).toBe(Date.UTC(2026, 9, 28, 12));
  });
});

describe('âge ouvré (4.1)', () => {
  it('vendredi 18h vers lundi 8h = 14 h', () => {
    expect(ageOuvreHeures(d(2026, 11, 6, 18), d(2026, 11, 9, 8))).toBe(14);
  });
  it('mardi vers mercredi à la même heure = 24 h', () => {
    expect(ageOuvreHeures(d(2026, 11, 3, 10), d(2026, 11, 4, 10))).toBe(24);
  });
  it('un week-end entièrement traversé retire 48 h', () => {
    expect(ageOuvreHeures(d(2026, 11, 6, 0), d(2026, 11, 9, 0))).toBe(24);
  });
  it('une demande du samedi midi n’a que 8 h ouvrées le lundi 8h', () => {
    expect(ageOuvreHeures(d(2026, 11, 7, 12), d(2026, 11, 9, 8))).toBe(8);
  });
  it('jamais négatif', () => {
    expect(ageOuvreHeures(d(2026, 11, 9, 8), d(2026, 11, 6, 18))).toBe(0);
  });
  it('jours ouvrés', () => {
    // vendredi 6 → mardi 10 : 4 jours calendaires, 2 jours ouvrés.
    expect(ageOuvreJours(d(2026, 11, 6, 9), d(2026, 11, 10, 9))).toBe(2);
  });
  it('jours calendaires', () => {
    expect(ageJours(d(2026, 10, 29, 10), d(2026, 11, 6, 9))).toBe(8);
    expect(ageJours(d(2026, 11, 5, 23), d(2026, 11, 6, 9))).toBe(1);
    expect(ageJours(d(2026, 10, 28, 10), d(2026, 11, 6, 9))).toBe(9);
  });
});

describe('lireDateRotation (4.7)', () => {
  it('28/12 lu le 02/01 : passée de 5 jours, année précédente', () => {
    expect(lireDateRotation('28/12', d(2027, 1, 2))).toEqual(d(2026, 12, 28));
  });
  it('10/01 lu le 05/11 : janvier prochain', () => {
    expect(lireDateRotation('10/01', d(2026, 11, 5))).toEqual(d(2027, 1, 10));
  });
  it('20/10 lu le 06/11 : passée de 17 jours, année courante', () => {
    expect(lireDateRotation('20/10', d(2026, 11, 6))).toEqual(d(2026, 10, 20));
  });
  it('une date passée depuis plus de 30 jours est celle de l’an prochain', () => {
    expect(lireDateRotation('01/10', d(2026, 11, 6))).toEqual(d(2027, 10, 1));
  });
  it('aujourd’hui est aujourd’hui', () => {
    expect(lireDateRotation('06/11', d(2026, 11, 6, 15))).toEqual(d(2026, 11, 6));
  });
  it('le départ se lit à partir de la clôture', () => {
    const cloture = lireDateRotation('28/12', d(2026, 11, 6));
    expect(cloture).toEqual(d(2026, 12, 28));
    expect(lireDateRotation('02/01', d(2026, 11, 6), cloture ?? undefined)).toEqual(d(2027, 1, 2));
    expect(lireDateRotation('18/11', d(2026, 11, 6), d(2026, 11, 14))).toEqual(d(2026, 11, 18));
  });
  it('texte illisible', () => {
    expect(lireDateRotation('bientôt', d(2026, 11, 6))).toBeNull();
    expect(lireDateRotation('', d(2026, 11, 6))).toBeNull();
    expect(lireDateRotation('32/01', d(2026, 11, 6))).toBeNull();
  });
  it('29/02 saute les années non bissextiles', () => {
    expect(lireDateRotation('29/02', d(2026, 11, 6))).toEqual(d(2028, 2, 29));
  });
  it('rotation terminée : départ passé', () => {
    expect(rotationTerminee({ cloture: '20/10', depart: '24/10' }, d(2026, 11, 6))).toBe(true);
    expect(rotationTerminee({ cloture: '14/11', depart: '18/11' }, d(2026, 11, 6))).toBe(false);
  });
});

describe('formats', () => {
  it('dates', () => {
    expect(formaterDate(d(2026, 10, 28))).toBe('28/10/2026');
    expect(formaterDateHeure(d(2026, 10, 28, 14, 2))).toBe('28/10/2026 à 14h02');
  });
  it('ilYa', () => {
    const now = d(2026, 11, 6, 9);
    expect(ilYa(d(2026, 11, 6, 7), now)).toBe("aujourd'hui");
    expect(ilYa(d(2026, 11, 5, 7), now)).toBe('hier');
    expect(ilYa(d(2026, 11, 3, 7), now)).toBe('il y a 3 jours');
  });
  it('téléphones en groupes de deux chiffres', () => {
    expect(formaterTelephone('0612345678')).toBe('06 12 34 56 78');
    expect(formaterTelephone('+33 6 12 34 56 78')).toBe('06 12 34 56 78');
    expect(formaterTelephone('0033612345678')).toBe('06 12 34 56 78');
    expect(formaterTelephone('+221 77 123 45 67')).toBe('+221 77 123 45 67');
    expect(formaterTelephone(undefined)).toBe('');
    expect(formaterTelephone('—')).toBe('');
  });
  it('volume', () => {
    expect(lireVolume('8 m³')).toBe(8);
    expect(lireVolume('8m3')).toBe(8);
    expect(lireVolume('12,5 m³')).toBe(12.5);
    expect(lireVolume('8')).toBe(8);
    expect(lireVolume('Environ 8 m³ (20 colis)')).toBe(8);
    expect(lireVolume('5 à 8 m³')).toBeNull();
    expect(lireVolume('2 m³ et 3 m³')).toBeNull();
    expect(lireVolume('un petit volume')).toBeNull();
    expect(lireVolume(undefined)).toBeNull();
    expect(lireVolume('0 m³')).toBeNull();
  });
});
