import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as chiffrage from '../../domaine/chiffrage';
import { ficheDe, prixManquants } from '../../domaine/fiches';
import { construireHistorique } from '../../domaine/historique';
import { appelClient, messageComplements, messageWhatsApp, questionsFacturation, texteCopieFacture } from '../../domaine/messages';
import { manquesFacturation } from '../../domaine/manques';
import { appliquerGrille, proposerDelai } from '../../domaine/suggestions';
import type { Fiche, Rotation } from '../../domaine/types';
import { demande, dossierDemande, dossierExpedition, expedition, MAINTENANT } from './fabrique';

const NBSP = ' ';

describe('chiffrage : équivalence avec le jumeau de l’API (apps/api/src/montant.js)', () => {
  it('mêmes résultats sur une table de cas', async () => {
    const chemin = resolve(__dirname, '../../../../../api/src/montant.js');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api: any = await import(/* @vite-ignore */ pathToFileURL(chemin).href);
    const cas = [
      {},
      null,
      { montantHT: 1250, tauxTVA: 20 },
      { montantHT: 980, tauxTVA: 0 },
      { montantHT: 10.05, tauxTVA: 20 },
      { montantHT: 0.3, tauxTVA: 20 },
      { montantHT: 1234567.5, tauxTVA: 5.5 },
      { montantHT: 0, tauxTVA: 20 },
      { montantHT: 1250 },
      { tauxTVA: 20 },
      { montantDevis: '1 250 €' },
      { montantDevis: '   ' },
      { montantHT: 100, tauxTVA: 20, montantDevis: '999 €' },
    ];
    for (const c of cas) {
      expect(chiffrage.aUnMontant(c)).toBe(api.aUnMontant(c));
      expect(chiffrage.lignesMontant(c)).toEqual(api.lignesMontant(c));
      expect(chiffrage.montantAnnonce(c)).toEqual(api.montantAnnonce(c));
      expect(chiffrage.libelleMontant(c)).toEqual(api.libelleMontant(c));
      expect(chiffrage.calculerChiffrage(c?.montantHT, c?.tauxTVA)).toEqual(api.calculerChiffrage(c?.montantHT, c?.tauxTVA));
    }
    expect(chiffrage.euros(1250)).toBe(api.euros(1250));
    expect(chiffrage.pourcentage(5.5)).toBe(api.pourcentage(5.5));
    expect(chiffrage.MENTION_EXONERATION).toBe(api.MENTION_EXONERATION);
    expect(chiffrage.TAUX_TVA).toEqual(api.TAUX_TVA);
  });

  it('le zéro n’est pas le vide', () => {
    expect(chiffrage.calculerChiffrage(980, 0)).toEqual({ ht: 980, taux: 0, tva: 0, ttc: 980 });
    expect(chiffrage.lireMontantSaisi('')).toBeUndefined();
    expect(chiffrage.lireMontantSaisi('0')).toBe(0);
    expect(chiffrage.lireMontantSaisi('1 250,50')).toBe(1250.5);
    expect(Number.isNaN(chiffrage.lireMontantSaisi('abc'))).toBe(true);
  });
});

const fiche = (extra: Partial<Fiche>): Fiche => ({ _id: 'f1', _rev: 'r', _type: 'ficheService', titre: 'Groupage', ...extra });

describe('appliquerGrille (4.3)', () => {
  const groupage = fiche({ grille: [{ designation: 'Groupage maritime', unite: 'm³', prixHT: 400 }] });
  it('calcule volume × prix de la grille et montre le détail', () => {
    expect(appliquerGrille(demande({ volume: '8 m³' }), groupage)).toEqual({
      montantHT: 3200,
      detail: `8${NBSP}m³ × 400${NBSP}€ = 3${NBSP}200${NBSP}€ HT`,
    });
  });
  it('rien sans fiche, sans prix de grille, sans volume lisible, ou si ambigu', () => {
    expect(appliquerGrille(demande({ volume: '8 m³' }), null)).toBeNull();
    expect(appliquerGrille(demande({ volume: '8 m³' }), fiche({ grille: [{ designation: 'x', unite: 'm³', prixHT: null }] }))).toBeNull();
    expect(appliquerGrille(demande({ volume: '8 m³' }), fiche({ grille: [] }))).toBeNull();
    expect(appliquerGrille(demande({ volume: 'beaucoup' }), groupage)).toBeNull();
    expect(appliquerGrille(demande({ volume: '5 à 8 m³' }), groupage)).toBeNull();
    expect(
      appliquerGrille(
        demande({ volume: '8 m³' }),
        fiche({ grille: [{ designation: 'a', unite: 'm³', prixHT: 400 }, { designation: 'b', unite: 'm³', prixHT: 300 }] }),
      ),
    ).toBeNull();
    expect(
      appliquerGrille(demande({ volume: '8 m³' }), fiche({ grille: [{ designation: 'a', unite: 'colis', prixHT: 30 }] })),
    ).toBeNull();
  });
});

describe('proposerDelai (4.3)', () => {
  const rot = (cloture: string, depart: string): Rotation => ({ _id: cloture, _rev: 'r', _type: 'rotation', cloture, depart });
  it('propose la prochaine clôture', () => {
    expect(proposerDelai([rot('20/10', '24/10'), rot('14/11', '18/11')], MAINTENANT)).toEqual({
      texte: 'Prochaine clôture le 14/11, départ le 18/11',
    });
  });
  it('rien s’il n’y a pas de rotation à venir', () => {
    expect(proposerDelai([rot('20/10', '24/10')], MAINTENANT)).toBeNull();
    expect(proposerDelai([], MAINTENANT)).toBeNull();
  });
});

describe('fiches (copie V1)', () => {
  const f = fiche({ libellesFormulaire: ['Groupage maritime'] });
  it('retrouve la fiche par le type d’envoi', () => {
    expect(ficheDe({ typeEnvoi: 'groupage maritime' }, [f]).fiche?._id).toBe('f1');
    expect(ficheDe({ typeEnvoi: 'Avion' }, [f]).fiche).toBeNull();
    expect(ficheDe({ ficheService: { _ref: 'f1' } }, [f])).toMatchObject({ manuel: true });
  });
  it('compte les prix manquants', () => {
    expect(prixManquants(fiche({ grille: [{ designation: 'a', prixHT: null }, { designation: 'b', prixHT: 3 }] }))).toBe(1);
  });
});

describe('appelClient (jamais « Garage » pour une raison sociale)', () => {
  it('prénom pour une personne, nom complet pour une société', () => {
    expect(appelClient('Martin Dupont')).toBe('Martin');
    expect(appelClient('Garage Factice SARL')).toBe('Garage Factice SARL');
    expect(appelClient('Les Jardins Fictifs')).toBe('Les Jardins Fictifs');
    expect(appelClient('Café Imaginaire')).toBe('Café Imaginaire');
    expect(appelClient('Test')).toBe('Test');
    expect(appelClient('Exemple & Fils')).toBe('Exemple & Fils');
    expect(appelClient('Transports Lambda')).toBe('Transports Lambda');
  });
  it('le type de client connu l’emporte', () => {
    expect(appelClient('Dupont Exemple', 'professionnel')).toBe('Dupont Exemple');
    expect(appelClient('Awa Diop', 'professionnel')).toBe('Awa Diop');
    expect(appelClient('Awa Diop', 'particulier')).toBe('Awa');
    expect(appelClient('', 'particulier')).toBe('');
  });
  it('la salutation WhatsApp suit la même règle', () => {
    expect(messageWhatsApp(demande({ clientNom: 'Garage Factice SARL' }))).toMatch(/^Bonjour Garage Factice SARL,/);
  });
});

describe('messages', () => {
  it('WhatsApp court', () => {
    expect(messageWhatsApp(demande())).toContain('Bonjour Martin');
    expect(messageWhatsApp(demande())).toContain('DEV-2611-001');
  });
  it('compléments : une ligne par question, signature', () => {
    const t = messageComplements(demande(), ['Quel est le poids ?', '  ']);
    expect(t).toContain('- Quel est le poids ?');
    expect(t).toContain("L'équipe HGWF Cargo");
    expect(messageComplements(demande(), [], fiche({ infosAObtenir: ['Dimensions'] }))).toContain('- Dimensions');
  });
  it('questions de facturation d’après les manques', () => {
    const q = questionsFacturation(manquesFacturation(demande({ facturationType: 'professionnel' })));
    expect(q.join(' ')).toContain('raison sociale');
    expect(q.join(' ')).toContain('SIRET');
  });
  it('copier pour la facture : HT, TVA, TTC et mention d’exonération', () => {
    const t = texteCopieFacture(
      demande({
        facturationNom: 'Dupont SARL',
        facturationAdresse: '1 rue X',
        facturationCodePostal: '75001',
        facturationVille: 'Paris',
        facturationPays: 'France',
        descriptionPrestation: 'Groupage Le Havre - Dakar',
        montantHT: 980,
        tauxTVA: 0,
      }),
    );
    expect(t).toContain('Dupont SARL');
    expect(t).toContain('Groupage Le Havre - Dakar');
    expect(t).toContain(`Montant HT : 980,00${NBSP}€`);
    expect(t).toContain('Total TTC');
    expect(t).toContain(chiffrage.MENTION_EXONERATION);
  });
});

describe('historique', () => {
  it('frise du plus récent au plus ancien, dates lisibles', () => {
    const h = construireHistorique(
      dossierDemande({
        recueLe: '28/10/2026 à 14h02',
        accuseReceptionLe: '28/10/2026 à 14h03',
        devisEnvoyeLe: '29/10/2026 à 10h00',
        devisEnvoyeA: 'martin@example.fr',
        acceptationLe: '03/11/2026',
        acceptationPar: 'Marie',
      }),
    );
    expect(h.map((e) => e.libelle)).toEqual([
      'Devis accepté par le client',
      'Devis envoyé à martin@example.fr',
      'Accusé de réception envoyé',
      'Demande reçue',
    ]);
    expect(h[0]).toMatchObject({ dateTexte: '03/11/2026', auteur: 'Marie' });
    expect(h[3]?.dateTexte).toBe('28/10/2026 à 14h02');
    expect(h.some((e) => /\d{4}-\d{2}-\d{2}/.test(e.dateTexte))).toBe(false);
  });
  it('expédition : prise en charge, notification, règlement, dérogation', () => {
    const h = construireHistorique(
      dossierExpedition({
        priseEnChargeLe: '02/11/2026 à 09h00',
        derniereNotificationLe: '04/11/2026 à 11h00',
        derniereEtapeNotifiee: 2,
        reglementRecuLe: '01/11/2026 à 10h00',
        derogationLe: '01/11/2026 à 12h00',
        derogationPar: 'Franck',
      }),
    );
    const libelles = h.map((e) => e.libelle);
    expect(libelles).toContain('Client prévenu (En mer)');
    expect(libelles).toContain('Départ autorisé sans règlement');
    expect(h.find((e) => e.libelle.startsWith('Départ'))?.auteur).toBe('Franck');
    expect(expedition().reference).toBeTruthy();
  });
  it('les traces illisibles passent en fin', () => {
    const h = construireHistorique(dossierDemande({ recueLe: 'hier soir', devisEnvoyeLe: '29/10/2026' }));
    expect(h[h.length - 1]?.libelle).toBe('Demande reçue');
  });
});
