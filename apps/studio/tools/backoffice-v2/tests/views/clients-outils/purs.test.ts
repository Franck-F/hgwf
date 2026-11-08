/**
 * Tests purs du lot 13 : conversions de dates des rotations, chiffres du mois,
 * feuille d'export, synthèse et filtre des clients. Aucun DOM, aucun réseau.
 */
import { describe, expect, it } from 'vitest';
import { assemblerContact, filtrer, synthese, trierParNom } from '../../../views/Clients/contactClient';
import { chiffresDuMois, idMois, moisDisponibles } from '../../../views/Outils/chiffres';
import { erreursRotation, lireChampDate, lireRemplissage, versChampDate, versJourMois } from '../../../views/Outils/dates';
import { COLONNES, construireFeuille, ligneDossier } from '../../../views/Outils/ExportDossiers';
import type { ClientFiche, Dossier } from '../../../domaine/types';
import { MAINTENANT, demande, dossierDemande, dossierExpedition } from '../../domaine/fabrique';

describe('dates des rotations', () => {
  it('convertit le sélecteur en JJ/MM stocké, sans année', () => {
    expect(versJourMois('2026-11-14')).toBe('14/11');
    expect(versJourMois('2027-01-05')).toBe('05/01');
    expect(versJourMois('')).toBe('');
    expect(versJourMois('14/11')).toBe('');
  });

  it('refait la valeur du sélecteur depuis une date lue', () => {
    expect(versChampDate(new Date(2026, 10, 14))).toBe('2026-11-14');
    expect(versChampDate(null)).toBe('');
    expect(lireChampDate('2026-11-14')?.getDate()).toBe(14);
    expect(lireChampDate('2026-02-31')).toBeNull();
  });

  it('exige nom et clôture, et un départ après la clôture', () => {
    expect(erreursRotation({ nom: '', cloture: '', depart: '', remplissage: '' })).toEqual({
      nom: 'Indiquez le nom de la rotation.',
      cloture: 'Choisissez la date de clôture.',
    });
    expect(erreursRotation({ nom: 'Dakar', cloture: '2026-11-14', depart: '2026-11-10', remplissage: '' }).depart).toMatch(
      /après la clôture/,
    );
    expect(erreursRotation({ nom: 'Dakar', cloture: '2026-11-14', depart: '2026-11-18', remplissage: '60' })).toEqual({});
  });

  it('borne le remplissage entre 0 et 100 et lit la virgule', () => {
    const base = { nom: 'Dakar', cloture: '2026-11-14', depart: '' };
    expect(erreursRotation({ ...base, remplissage: '101' }).remplissage).toBeDefined();
    expect(erreursRotation({ ...base, remplissage: 'abc' }).remplissage).toBeDefined();
    expect(erreursRotation({ ...base, remplissage: '-1' }).remplissage).toBeDefined();
    expect(erreursRotation({ ...base, remplissage: '0' })).toEqual({});
    expect(lireRemplissage('')).toBe(0);
    expect(lireRemplissage('72,4')).toBe(72);
  });
});

describe('chiffres du mois', () => {
  const dossiers: Dossier[] = [
    dossierDemande({ _id: 'a', reference: 'DEV-2611-001', recueLe: '03/11/2026', statut: 0 }, 'a'),
    dossierDemande({ _id: 'b', reference: 'DEV-2611-002', recueLe: '04/11/2026', statut: 2, devisEnvoyeLe: '05/11/2026' }, 'b'),
    dossierDemande({ _id: 'c', reference: 'DEV-2611-003', recueLe: '05/11/2026 à 10h00', statut: 3 }, 'c'),
    dossierDemande({ _id: 'd', reference: 'DEV-2610-001', recueLe: '20/10/2026', statut: 2, devisEnvoyeLe: '21/10/2026' }, 'd'),
    // Ancien devis hors outil : compté comme envoyé, jamais comme relancé.
    dossierDemande(
      { _id: 'e', reference: 'DEV-2611-004', recueLe: '02/11/2026', statut: 2, devisEnvoyeHorsOutilLe: '03/11/2026' },
      'e',
    ),
    {
      id: 'f',
      demande: demande({ _id: 'f', reference: 'DEV-2611-005', recueLe: '01/11/2026', statut: 4 }),
      expedition: {
        _id: 'exp-f',
        _rev: 'x',
        _type: 'expedition',
        _createdAt: '2026-11-03T10:00:00Z',
        colisVolume: 8.5,
      },
    },
    // Expédition seule créée en octobre : hors du mois.
    dossierExpedition({ _id: 'exp-g', _createdAt: '2026-10-12T10:00:00Z', colisVolume: 20 }, null),
  ];

  it('compte les demandes reçues, les devis envoyés, les acceptés et le taux', () => {
    const c = chiffresDuMois(dossiers, '2026-11');
    expect(c.recues).toBe(5);
    expect(c.devisEnvoyes).toBe(4); // b, c (statut 3), e (hors outil), f (statut 4)
    expect(c.acceptes).toBe(2); // c et f
    expect(c.tauxAcceptation).toBe(50);
    expect(c.volumeM3).toBe(8.5);
  });

  it('n’invente pas de taux sans devis, et lit octobre à part', () => {
    expect(chiffresDuMois([], '2026-11').tauxAcceptation).toBeNull();
    const octobre = chiffresDuMois(dossiers, '2026-10');
    expect(octobre.recues).toBe(1);
    expect(octobre.volumeM3).toBe(20);
  });

  it('retombe sur le volume de la demande quand l’expédition n’en a pas', () => {
    const d: Dossier = {
      id: 'v',
      demande: demande({ _id: 'v', recueLe: '02/11/2026', statut: 4, volume: '12 m³' }),
      expedition: { _id: 'x', _rev: 'x', _type: 'expedition', _createdAt: '2026-11-02T08:00:00Z' },
    };
    expect(chiffresDuMois([d], '2026-11').volumeM3).toBe(12);
  });

  it('propose les douze derniers mois, le courant d’abord', () => {
    const mois = moisDisponibles(MAINTENANT);
    expect(mois).toHaveLength(12);
    expect(mois[0]).toEqual({ id: '2026-11', libelle: 'novembre 2026' });
    expect(mois[2]).toEqual({ id: '2026-09', libelle: 'septembre 2026' });
    expect(mois[11]!.id).toBe('2025-12');
    expect(idMois(2026, 0)).toBe('2026-01');
  });
});

describe('export des dossiers', () => {
  const avecMontant = dossierDemande(
    {
      _id: 'm',
      reference: 'DEV-2611-009',
      statut: 2,
      montantHT: 1000,
      tauxTVA: 0,
      devisEnvoyeLe: '05/11/2026',
      facturationType: 'particulier',
      facturationSiret: '12345678901234',
    },
    'm',
  );

  it('a autant de cellules que de colonnes, pour tous les types de dossier', () => {
    for (const d of [avecMontant, dossierExpedition({}, { statut: 4 }), dossierExpedition({}, null)]) {
      expect(ligneDossier(d)).toHaveLength(COLONNES.length);
    }
  });

  it('écrit les montants en nombres, et rien quand le chiffrage est incomplet', () => {
    const feuille = construireFeuille([avecMontant, dossierDemande({ _id: 'n', reference: 'DEV-2611-010' }, 'n')]);
    const ent = feuille[0]!;
    const iHT = ent.indexOf('Montant HT');
    const complet = feuille.find((l) => l[0] === 'DEV-2611-009')!;
    const vide = feuille.find((l) => l[0] === 'DEV-2611-010')!;
    expect(complet.slice(iHT, iHT + 4)).toEqual([1000, 0, 0, 1000]);
    expect(vide.slice(iHT, iHT + 4)).toEqual(['', '', '', '']);
  });

  it('ne sort pas le SIRET d’un client particulier, ni d’ancien montant converti', () => {
    const ligne = construireFeuille([avecMontant])[1]!;
    expect(ligne).not.toContain('12345678901234');
    const ancien = dossierDemande({ _id: 'o', reference: 'DEV-2611-011', montantDevis: '1 200 € environ' }, 'o');
    const l = construireFeuille([ancien])[1]!;
    expect(l[construireFeuille([ancien])[0]!.indexOf('Montant (ancien)')]).toBe('1 200 € environ');
    expect(l[construireFeuille([ancien])[0]!.indexOf('Montant HT')]).toBe('');
  });

  it('marque un devis envoyé hors outil et n’écrit aucune date ISO', () => {
    const horsOutil = dossierDemande({ _id: 'h', reference: 'DEV-2611-012', statut: 2, devisEnvoyeHorsOutilLe: '04/11/2026' }, 'h');
    const feuille = construireFeuille([horsOutil, avecMontant, dossierExpedition({ eta: '14/11/2026' })]);
    const cellules = feuille.flat().filter((c): c is string => typeof c === 'string');
    expect(cellules).toContain('04/11/2026 (hors outil)');
    expect(cellules.some((c) => /^\d{4}-\d{2}-\d{2}T?/.test(c))).toBe(false);
  });

  it('trie les références les plus récentes d’abord et garde la phase en clair', () => {
    const feuille = construireFeuille([
      dossierDemande({ _id: 'a', reference: 'DEV-2610-001' }, 'a'),
      dossierDemande({ _id: 'b', reference: 'DEV-2611-001' }, 'b'),
    ]);
    expect(feuille[1]![0]).toBe('DEV-2611-001');
    expect(feuille[1]![feuille[0]!.indexOf('Phase')]).toBe('Nouvelle demande');
  });
});

describe('clients : synthèse et filtre', () => {
  const dupont: ClientFiche = { _id: 'c1', _rev: 'r', _type: 'clientFiche', nom: 'Dupont', contact: 'dupont@example.fr · 06 12 34 56 78' };
  const durand: ClientFiche = { _id: 'c2', _rev: 'r', _type: 'clientFiche', nom: 'Élodie Durand', contact: 'elodie@example.fr' };
  const dossiers: Dossier[] = [
    dossierDemande({ _id: 'd1', clientNom: 'Dupont', email: 'dupont@example.fr', recueLe: '01/11/2026' }, 'd1'),
    dossierDemande({ _id: 'd2', clientNom: 'DUPONT', email: undefined, recueLe: '03/11/2026' }, 'd2'),
    dossierDemande({ _id: 'd3', clientNom: 'Dupond', email: 'x@example.fr' }, 'd3'),
  ];

  it('lit e-mail et téléphone dans la chaîne « mail · tél » et compte les dossiers', () => {
    const s = synthese(dupont, dossiers);
    expect(s.email).toBe('dupont@example.fr');
    expect(s.telephone).toBe('06 12 34 56 78');
    // d1 par e-mail ; d2 (sans e-mail) par nom normalisé ; « Dupond » n’est pas « Dupont ».
    expect(s.dossiers.map((d) => d.id).sort()).toEqual(['d1', 'd2']);
    expect(s.dernier).not.toBeNull();
    expect(synthese(durand, dossiers).dossiers).toHaveLength(0);
    expect(synthese(durand, dossiers).dernier).toBeNull();
  });

  it('reconstruit la chaîne de contact sans séparateur orphelin', () => {
    expect(assemblerContact('a@b.fr', '06 00 00 00 01')).toBe('a@b.fr · 06 00 00 00 01');
    expect(assemblerContact('a@b.fr', '')).toBe('a@b.fr');
    expect(assemblerContact('', ' 06 00 00 00 01 ')).toBe('06 00 00 00 01');
    expect(assemblerContact('', '')).toBe('');
  });

  it('trie sans accents ni casse et filtre par nom, e-mail ou téléphone', () => {
    const liste = trierParNom([synthese(dupont, dossiers), synthese(durand, dossiers)]);
    expect(liste.map((s) => s.nom)).toEqual(['Dupont', 'Élodie Durand']);
    expect(filtrer(liste, 'elodie').map((s) => s.nom)).toEqual(['Élodie Durand']);
    expect(filtrer(liste, 'DUPONT@').map((s) => s.nom)).toEqual(['Dupont']);
    expect(filtrer(liste, '+33 6 12 34 56 78').map((s) => s.nom)).toEqual(['Dupont']);
    expect(filtrer(liste, '0033612345678').map((s) => s.nom)).toEqual(['Dupont']);
    expect(filtrer(liste, '06 1')).toEqual([]); // moins de 4 chiffres : ne rapproche pas par erreur
    expect(filtrer(liste, '')).toHaveLength(2);
  });
});
