/** Assemblage des dossiers (3.1), recherche globale (4.8), activité (verrous). */
import { describe, expect, it } from 'vitest';
import { avecVerrou, ecritureEnCours, reinitialiserActivite } from '../../data/activite';
import { construireDossiers, revisionsDuDossier, trouverDossier, trouverDossierParReferenceOuClient } from '../../data/dossiers';
import { MAX_RESULTATS, rechercher } from '../../data/recherche';
import type { ClientFiche, DonneesMagasin } from '../../domaine/types';
import { demandeDoc, expeditionDoc } from '../actions/fauxClient';

const donnees = (extra: Partial<DonneesMagasin> = {}): Pick<DonneesMagasin, 'demandes' | 'expeditions'> => ({
  demandes: [],
  expeditions: [],
  ...extra,
});

describe('construireDossiers', () => {
  it('joint par expeditionRef, jamais par l’égalité des références', () => {
    const d = demandeDoc({ _id: 'd1', reference: 'DEV-2610-012', expeditionRef: 'EXP-2610-001', statut: 4 });
    const x = expeditionDoc({ _id: 'x1', reference: 'EXP-2610-001' });
    const [dossier] = construireDossiers(donnees({ demandes: [d], expeditions: [x] }));
    expect(dossier?.id).toBe('d1');
    expect(dossier?.expedition?._id).toBe('x1');
  });

  it('repli sur demandeRef pour les anciens documents', () => {
    const d = demandeDoc({ _id: 'd1', reference: 'DEV-1', statut: 4 });
    const x = expeditionDoc({ _id: 'x1', reference: 'DEV-1', demandeRef: 'DEV-1' });
    expect(construireDossiers(donnees({ demandes: [d], expeditions: [x] }))[0]?.expedition?._id).toBe('x1');
  });

  it('une expédition sans demande est un dossier « expédition seule »', () => {
    const x = expeditionDoc({ _id: 'x9', reference: 'EXP-9' });
    const dossiers = construireDossiers(donnees({ expeditions: [x] }));
    expect(dossiers).toHaveLength(1);
    expect(dossiers[0]).toMatchObject({ id: 'x9' });
    expect(dossiers[0]?.demande).toBeUndefined();
  });

  it('une expédition n’est liée qu’à une seule demande', () => {
    const a = demandeDoc({ _id: 'a', reference: 'A', expeditionRef: 'EXP-1', statut: 4 });
    const b = demandeDoc({ _id: 'b', reference: 'B', expeditionRef: 'EXP-1', statut: 4 });
    const x = expeditionDoc({ _id: 'x', reference: 'EXP-1' });
    const dossiers = construireDossiers(donnees({ demandes: [a, b], expeditions: [x] }));
    expect(dossiers.filter((d) => d.expedition)).toHaveLength(1);
  });

  it('trouverDossier accepte l’identifiant de la demande OU celui de l’expédition liée', () => {
    const d = demandeDoc({ _id: 'd1', reference: 'DEV-1', expeditionRef: 'EXP-1', statut: 4 });
    const x = expeditionDoc({ _id: 'x1', reference: 'EXP-1' });
    const src = donnees({ demandes: [d], expeditions: [x] });
    expect(trouverDossier(src, 'd1')?.id).toBe('d1');
    expect(trouverDossier(src, 'x1')?.id).toBe('d1');
    expect(trouverDossier(src, 'inconnu')).toBeNull();
  });

  it('trouverDossierParReferenceOuClient retrouve le bon dossier à partir d’un devis ou d’un nom client', () => {
    const d = demandeDoc({ _id: 'd1', reference: 'DEV-2611-001', clientNom: 'Élodie Durand', email: 'elodie@example.fr', statut: 1 });
    const src = donnees({ demandes: [d] });
    expect(trouverDossierParReferenceOuClient(src, 'DEV-2611-001')?.id).toBe('d1');
    expect(trouverDossierParReferenceOuClient(src, 'elodie durand')?.id).toBe('d1');
    expect(trouverDossier(src, 'DEV-2611-001')?.id).toBe('d1');
  });

  it('trouverDossier : repli sur la référence exacte (casse ignorée), jamais sur un nom ou une référence approchée', () => {
    const d = demandeDoc({ _id: 'd1', reference: 'DEV-2611-001', clientNom: 'Élodie Durand', statut: 1 });
    const src = donnees({ demandes: [d] });
    expect(trouverDossier(src, 'dev-2611-001')?.id).toBe('d1');
    expect(trouverDossier(src, 'elodie durand')).toBeNull();
    expect(trouverDossier(src, 'DEV-2611')).toBeNull();
    expect(trouverDossier(src, 'demande-supprimee')).toBeNull();
  });

  it('revisionsDuDossier liste les révisions des documents présents', () => {
    const [d] = construireDossiers(donnees({ demandes: [demandeDoc({ _id: 'd1', _rev: 'r1' })] }));
    expect(revisionsDuDossier(d!)).toEqual({ d1: 'r1' });
  });
});

describe('recherche globale', () => {
  const fiche = (extra: Partial<ClientFiche>): ClientFiche => ({ _id: 'c', _rev: 'r', _type: 'clientFiche', ...extra });
  const dossiers = construireDossiers(
    donnees({
      demandes: [
        demandeDoc({ _id: 'd1', reference: 'DEV-2610-003', clientNom: 'Élodie Bâ', email: 'elodie@example.fr', telephone: '06 00 00 00 04', destination: 'Dakar', expeditionRef: 'EXP-2610-001', statut: 5 }),
        demandeDoc({ _id: 'd2', reference: 'DEV-2610-004', clientNom: 'Martin Dupont', email: 'martin@example.fr', telephone: '+33 6 12 34 56 78', destination: 'Abidjan' }),
      ],
      expeditions: [expeditionDoc({ _id: 'x1', reference: 'EXP-2610-001', clientNom: 'Élodie Bâ', numeroConteneur: 'MSKU1234567' })],
    }),
  );

  it('insensible aux accents et à la casse', () => {
    expect(rechercher('elodie ba', dossiers, []).dossiers.map((d) => d.dossierId)).toEqual(['d1']);
    expect(rechercher('MARTIN', dossiers, []).dossiers).toHaveLength(1);
  });

  it('trouve par référence de la demande, de l’expédition, e-mail, destination et conteneur', () => {
    for (const q of ['DEV-2610-003', 'EXP-2610-001', 'martin@example.fr', 'abidjan', 'MSKU1234567']) {
      expect(rechercher(q, dossiers, []).dossiers.length, q).toBeGreaterThan(0);
    }
  });

  it('retrouve un téléphone quelle que soit son écriture', () => {
    for (const q of ['06 12 34 56 78', '+33 6 12 34 56 78', '0033612345678', '0612345678']) {
      expect(rechercher(q, dossiers, []).dossiers.map((d) => d.dossierId), q).toEqual(['d2']);
    }
    expect(rechercher('06 00 00 00 04', dossiers, []).dossiers.map((d) => d.dossierId)).toEqual(['d1']);
  });

  it('cherche aussi dans les dossiers terminés (statut 5)', () => {
    expect(rechercher('Élodie', dossiers, []).dossiers).toHaveLength(1);
  });

  it('trouve les clients par nom, e-mail et téléphone', () => {
    const clients = [fiche({ _id: 'c1', nom: 'Awa Diop', contact: 'awa@x.fr · 07 11 22 33 44', destination: 'Dakar' })];
    expect(rechercher('awa', [], clients).clients[0]?.clientId).toBe('c1');
    expect(rechercher('+33 7 11 22 33 44', [], clients).clients).toHaveLength(1);
  });

  it('une requête vide ne trouve rien ; au plus 5 résultats par groupe', () => {
    expect(rechercher('   ', dossiers, [])).toEqual({ dossiers: [], clients: [] });
    const beaucoup = construireDossiers(
      donnees({ demandes: Array.from({ length: 12 }, (_, i) => demandeDoc({ _id: `d${i}`, reference: `DEV-${i}`, clientNom: 'Dupont' })) }),
    );
    expect(rechercher('dupont', beaucoup, []).dossiers).toHaveLength(MAX_RESULTATS);
  });

  it('un numéro trop court n’est pas pris pour un téléphone', () => {
    expect(rechercher('06', dossiers, []).dossiers).toHaveLength(0);
  });
});

describe('activité en cours', () => {
  it('le verrou refuse le second travail pour la même clé', async () => {
    reinitialiserActivite();
    let fin: () => void = () => undefined;
    const premier = avecVerrou('d1', () => new Promise<string>((r) => (fin = () => r('ok'))), () => 'occupé');
    expect(ecritureEnCours()).toBe(true);
    expect(await avecVerrou('d1', async () => 'second', () => 'occupé')).toBe('occupé');
    expect(await avecVerrou('d2', async () => 'autre', () => 'occupé')).toBe('autre');
    fin();
    expect(await premier).toBe('ok');
    expect(ecritureEnCours()).toBe(false);
  });

  it('le verrou est relâché même si le travail échoue', async () => {
    reinitialiserActivite();
    await expect(avecVerrou('d1', () => Promise.reject(new Error('x')), () => 'occupé')).rejects.toThrow('x');
    expect(ecritureEnCours()).toBe(false);
    expect(await avecVerrou('d1', async () => 'libre', () => 'occupé')).toBe('libre');
  });
});
