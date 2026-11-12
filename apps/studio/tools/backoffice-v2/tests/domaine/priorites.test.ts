import { describe, expect, it } from 'vitest';
import { calculerAFaire, derniereActivite, prochaineActionTexte, trierParUrgence } from '../../domaine/priorites';
import type { Dossier, Rotation } from '../../domaine/types';
import { dossierDemande, dossierExpedition, MAINTENANT } from './fabrique';

const calcul = (dossiers: Dossier[], rotations: Rotation[] = []) => calculerAFaire(dossiers, rotations, MAINTENANT);
const groupe = (r: ReturnType<typeof calcul>, id: string) => r.groupes.find((g) => g.id === id);

describe('calculerAFaire (4.1)', () => {
  it('demandes à ouvrir : plus ancienne d’abord, rouge au-delà de 24 h ouvrées', () => {
    const r = calcul([
      dossierDemande({ statut: 0, recueLe: '05/11/2026 à 10h00' }, 'recente'),
      dossierDemande({ statut: 0, recueLe: '03/11/2026 à 08h00' }, 'ancienne'),
    ]);
    const g = groupe(r, 'aOuvrir');
    expect(g?.lignes.map((l) => l.dossierId)).toEqual(['ancienne', 'recente']);
    expect(g?.lignes[0]?.enRetard).toBe(true);
    expect(g?.lignes[0]?.raison).toBe('Reçue il y a 3 jours');
    // 05/11 10h → 06/11 9h : 23 h, pas encore rouge.
    expect(g?.lignes[1]?.enRetard).toBe(false);
  });

  it('une demande du vendredi soir n’est pas rouge le lundi matin', () => {
    const lundi = new Date(2026, 10, 9, 8, 0);
    const r = calculerAFaire([dossierDemande({ statut: 0, recueLe: '06/11/2026 à 18h00' })], [], lundi);
    expect(groupe(r, 'aOuvrir')?.lignes[0]?.enRetard).toBe(false);
  });

  it('une demande de moins de 4 h ouvrées attend', () => {
    const r = calcul([dossierDemande({ statut: 0, recueLe: '06/11/2026 à 07h00' })]);
    expect(r.groupes).toEqual([]);
    expect(r.attente).toHaveLength(1);
  });

  it('groupe 2 : l’ordre a, b, c, d, e de la spécification', () => {
    const r = calcul([
      dossierDemande({ statut: 3, acceptationLe: '01/11/2026 à 08h00' }, 'e-accepte'),
      dossierDemande({ statut: 1, complementDemandeLe: '02/11/2026 à 08h00' }, 'd-complements'),
      dossierDemande({ statut: 1 }, 'c-montant'),
      dossierDemande(
        { statut: 1, complementDemandeLe: '02/11/2026 à 10h00', reponseClientLe: '05/11/2026 à 09h00' },
        'b-reponse',
      ),
      dossierDemande({ statut: 1, devisEnvoyeLe: '05/11/2026 à 14h02' }, 'a-devis-parti'),
    ]);
    expect(groupe(r, 'devis')?.lignes.map((l) => l.dossierId)).toEqual([
      'a-devis-parti',
      'b-reponse',
      'c-montant',
      'e-accepte',
    ]);
    const lignes = groupe(r, 'devis')?.lignes ?? [];
    expect(lignes[0]?.raison).toBe('Devis parti, statut à corriger');
    expect(lignes[1]?.raison).toBe('Réponse reçue, à chiffrer');
    expect(lignes[2]?.raison).toBe('Montant à saisir');
    expect(lignes[3]?.raison).toBe('Accepté il y a 5 jours, expédition à créer');
    expect(lignes[3]?.enRetard).toBe(true);
    // Compléments demandés il y a 4 jours : on attend le client, ce n’est pas une tâche.
    expect(r.attente.map((l) => l.dossierId)).toEqual(['d-complements']);
    expect(r.attente[0]?.attente).toBe('Compléments demandés il y a 4 jours, en attente du client');
  });

  it('compléments demandés : en attente, puis à relancer après 5 jours ouvrés, jamais en retard', () => {
    const r = calcul([
      dossierDemande({ statut: 1, complementDemandeLe: '05/11/2026 à 10h00' }, 'recent'),
      dossierDemande({ statut: 1, complementDemandeLe: '28/10/2026 à 10h00' }, 'ancien'),
      dossierDemande({ statut: 1, complementDemandeHorsOutil: 'email' }, 'inconnue'),
      dossierDemande({ statut: 1, complementDemandeLe: '28/10/2026', complementDemandeHorsOutil: 'email' }, 'horsoutil'),
    ]);
    expect(r.attente.map((l) => l.dossierId).sort()).toEqual(['inconnue', 'recent']);
    expect(r.attente.find((l) => l.dossierId === 'inconnue')?.attente).toBe(
      'Compléments demandés (date inconnue), en attente du client',
    );
    const g = groupe(r, 'sansReponse');
    expect(g?.titre).toBe('Clients à relancer');
    expect(g?.lignes.map((l) => l.dossierId).sort()).toEqual(['ancien', 'horsoutil']);
    expect(g?.lignes[0]?.raison).toContain('sans réponse : relancer le client');
    expect(r.groupes.flatMap((x) => x.lignes).some((l) => l.enRetard)).toBe(false);
    expect(r.attente.some((l) => l.enRetard)).toBe(false);
  });

  it('un statut 1 ne sort jamais : la réponse du client le fait remonter', () => {
    const r = calcul([
      dossierDemande({ statut: 1, complementDemandeLe: '02/11/2026 à 10h00', reponseClientLe: '05/11/2026 à 09h00' }),
    ]);
    expect(groupe(r, 'devis')?.lignes[0]?.phase).toBe('reponseRecue');
    expect(r.attente).toEqual([]);
  });

  it('chiffré : prêt à envoyer ; un devis parti n’y figure pas', () => {
    const r = calcul([
      dossierDemande({ statut: 1, montantHT: 100, tauxTVA: 0, descriptionPrestation: 'x' }, 'pret'),
      dossierDemande({ statut: 1, montantHT: 100, tauxTVA: 0, descriptionPrestation: 'x', devisEnvoyeLe: '05/11/2026' }, 'parti'),
    ]);
    const lignes = groupe(r, 'devis')?.lignes ?? [];
    expect(lignes.find((l) => l.dossierId === 'pret')?.raison).toBe('Chiffré, prêt à envoyer');
    expect(lignes.find((l) => l.dossierId === 'parti')?.raison).toBe('Devis parti, statut à corriger');
  });

  it('devis sans réponse : à appeler à partir de 7 jours, sinon en attente', () => {
    const r = calcul([
      dossierDemande({ statut: 2, devisEnvoyeLe: '29/10/2026', relanceEnvoyeeLe: '04/11/2026' }, 'huit'),
      dossierDemande({ statut: 2, devisEnvoyeLe: '03/11/2026 à 08h00' }, 'trois'),
      dossierDemande({ statut: 2, devisEnvoyeHorsOutilLe: '28/10/2026' }, 'hors'),
    ]);
    const g = groupe(r, 'sansReponse');
    expect(g?.lignes.map((l) => l.dossierId)).toEqual(['hors', 'huit']);
    expect(g?.lignes.find((l) => l.dossierId === 'huit')?.raison).toBe(
      'Envoyé il y a 8 jours, relancé automatiquement : à appeler',
    );
    expect(g?.lignes.find((l) => l.dossierId === 'hors')?.raison).toContain('hors outil');
    expect(r.attente.map((l) => l.dossierId)).toEqual(['trois']);
    expect(r.attente[0]?.attente).toBe('Devis envoyé il y a 3 jours');
  });

  it('devis envoyé sans date lisible : jamais invisible', () => {
    const r = calcul([dossierDemande({ statut: 2 })]);
    expect(groupe(r, 'sansReponse')?.lignes).toHaveLength(1);
  });

  it('expéditions : incident d’abord, puis manques, puis règlement', () => {
    const r = calcul([
      dossierExpedition({ _id: 'pret', statutPriseEnCharge: 1 }),
      dossierExpedition({ _id: 'prep', statutPriseEnCharge: 0 }),
      dossierExpedition({ _id: 'inc', statutPriseEnCharge: 4 }),
    ].map((d, i) => ({ ...d, id: ['pret', 'prep', 'inc'][i] ?? '' })));
    const g = groupe(r, 'expeditions');
    expect(g?.lignes.map((l) => l.dossierId)).toEqual(['inc', 'prep', 'pret']);
    expect(g?.lignes[1]?.raison).toBe('À préparer : il manque 7 informations');
    expect(g?.lignes[2]?.raison).toBe('Prête à partir, règlement non reçu');
  });

  it('en route : en attente si le suivi est récent, sinon dans le groupe', () => {
    const r = calcul([
      { ...dossierExpedition({ statutPriseEnCharge: 2, derniereNotificationLe: '04/11/2026 à 10h00' }), id: 'frais' },
      { ...dossierExpedition({ statutPriseEnCharge: 2, derniereNotificationLe: '20/10/2026 à 10h00' }), id: 'vieux' },
      {
        ...dossierExpedition({ statutPriseEnCharge: 2, derniereNotificationLe: '05/11/2026', eta: '01/11/2026' }),
        id: 'eta',
      },
      { ...dossierExpedition({ statutPriseEnCharge: 2, derniereNotificationLe: '05/11/2026', eta: 'À PLANIFIER' }), id: 'plan' },
    ]);
    expect(groupe(r, 'expeditions')?.lignes.map((l) => l.dossierId).sort()).toEqual(['eta', 'vieux']);
    expect(r.attente.map((l) => l.dossierId).sort()).toEqual(['frais', 'plan']);
  });

  it('les dossiers clos n’apparaissent nulle part', () => {
    const r = calcul([
      dossierDemande({ statut: 5 }),
      dossierExpedition({ statutPriseEnCharge: 3 }),
      dossierExpedition({ statutPriseEnCharge: 5 }),
    ]);
    expect(r.groupes).toEqual([]);
    expect(r.attente).toEqual([]);
    expect(r.nbUrgents).toBe(0);
  });

  it('chaque ligne porte le libellé de l’action principale', () => {
    const r = calcul([dossierDemande({ statut: 0, recueLe: '03/11/2026' })]);
    expect(groupe(r, 'aOuvrir')?.lignes[0]?.actionLibelle).toBe('Prendre en charge');
  });

  it('compte les urgences', () => {
    const r = calcul([
      dossierDemande({ statut: 0, recueLe: '01/11/2026' }, 'a'),
      dossierDemande({ statut: 1, devisEnvoyeLe: '05/11/2026' }, 'b'),
      dossierDemande({ statut: 2, devisEnvoyeLe: '01/11/2026' }, 'c'),
    ]);
    expect(r.nbUrgents).toBe(2);
  });

  it('prochaine clôture : la plus proche à venir, la passée ignorée', () => {
    const rot = (id: string, cloture: string, depart: string): Rotation => ({
      _id: id,
      _rev: 'r',
      _type: 'rotation',
      nom: id,
      cloture,
      depart,
    });
    const r = calcul([], [rot('passee', '20/10', '24/10'), rot('lointaine', '10/12', '14/12'), rot('proche', '14/11', '18/11')]);
    expect(r.prochaineCloture?.rotationId).toBe('proche');
    expect(calcul([], [rot('passee', '20/10', '24/10')]).prochaineCloture).toBeNull();
  });
});

describe('liste des dossiers', () => {
  it('trie par urgence puis activité récente, clos à la fin', () => {
    const dossiers: Dossier[] = [
      { ...dossierDemande({ statut: 5, _updatedAt: '2026-11-05T10:00:00Z' }), id: 'clos' },
      { ...dossierDemande({ statut: 2, devisEnvoyeLe: '03/11/2026 à 10h00', _updatedAt: '2026-11-03T10:00:00Z' }), id: 'attente' },
      { ...dossierDemande({ statut: 0, recueLe: '01/11/2026' }), id: 'urgent' },
    ];
    expect(trierParUrgence(dossiers, MAINTENANT).map((d) => d.id)).toEqual(['urgent', 'attente', 'clos']);
  });
  it('texte de prochaine action', () => {
    expect(prochaineActionTexte(dossierDemande({ statut: 0 }))).toBe('Prendre en charge');
  });
  it('dernière activité : la date la plus récente des traces', () => {
    const d = dossierDemande({ recueLe: '01/11/2026', devisEnvoyeLe: '04/11/2026 à 15h30' });
    expect(derniereActivite(d)).toEqual(new Date(2026, 10, 4, 15, 30));
    expect(derniereActivite({ id: 'x' })).toBeNull();
  });
});
