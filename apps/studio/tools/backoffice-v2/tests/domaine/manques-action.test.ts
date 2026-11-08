import { describe, expect, it } from 'vitest';
import { actionPrincipale } from '../../domaine/actionPrincipale';
import { champsModifies, champsModifiesDossier, fusionner } from '../../domaine/fusion';
import {
  departAutorise,
  manquesConversion,
  manquesDepart,
  manquesDevis,
  manquesEnvoiComplement,
  manquesFacturation,
  manquesPriseEnCharge,
} from '../../domaine/manques';
import { demande, dossierDemande, dossierExpedition, expedition } from './fabrique';

describe('manquesDevis', () => {
  it('liste ce qui manque', () => {
    expect(manquesDevis(demande({ email: undefined }))).toEqual([
      'le montant HT',
      'le taux de TVA',
      'la description de la prestation',
      "l'adresse e-mail du client",
    ]);
  });
  it('0 % de TVA est un taux valide, 0 € ne part pas', () => {
    const ok = demande({ montantHT: 980, tauxTVA: 0, descriptionPrestation: 'Groupage' });
    expect(manquesDevis(ok)).toEqual([]);
    expect(manquesDevis({ ...ok, montantHT: 0 })).toHaveLength(1);
  });
  it('montant sans taux : le taux manque', () => {
    expect(manquesDevis(demande({ montantHT: 100, descriptionPrestation: 'x' }))).toEqual(['le taux de TVA']);
  });
  it('NaN n’est pas un montant', () => {
    expect(manquesDevis(demande({ montantHT: Number.NaN, tauxTVA: 20, descriptionPrestation: 'x' }))).toContain(
      'le montant HT',
    );
  });
  it('ancien montant texte : tient lieu de montant', () => {
    expect(manquesDevis(demande({ montantDevis: '1 250 €', descriptionPrestation: 'x' }))).toEqual([]);
  });
  it('compléments : seule l’adresse e-mail compte', () => {
    expect(manquesEnvoiComplement(demande())).toEqual([]);
    expect(manquesEnvoiComplement(demande({ email: '  ' }))).toHaveLength(1);
  });
});

describe('manquesFacturation', () => {
  it('le pays suggéré mais non enregistré est un manque', () => {
    const d = demande({
      facturationType: 'particulier',
      facturationNom: 'Dupont',
      facturationAdresse: '1 rue X',
      facturationCodePostal: '75001',
      facturationVille: 'Paris',
    });
    expect(manquesFacturation(d)).toEqual(['pays']);
    expect(manquesFacturation({ ...d, facturationPays: 'France' })).toEqual([]);
  });
  it('SIRET requis pour un professionnel', () => {
    const m = manquesFacturation(demande({ facturationType: 'professionnel' }));
    expect(m).toContain('SIRET');
    expect(m).toContain('raison sociale');
  });
});

describe('prise en charge et départ', () => {
  const complete = expedition({
    expediteurAdresse: 'a',
    destinataireNom: 'b',
    destinataireAdresse: 'c',
    colisNature: 'd',
    colisNombre: 3,
    colisVolume: 2,
    mode: 'Groupage maritime',
  });
  it('7 manques sur une expédition vide', () => {
    expect(manquesPriseEnCharge(expedition())).toHaveLength(7);
  });
  it('aucun manque quand tout est renseigné', () => {
    expect(manquesPriseEnCharge(complete)).toEqual([]);
  });
  it('poids OU volume suffit ; 0 est une valeur', () => {
    expect(manquesPriseEnCharge({ ...complete, colisVolume: undefined, colisPoids: 0 })).toEqual([]);
    expect(manquesPriseEnCharge({ ...complete, colisVolume: undefined })).toEqual(['le poids ou le volume']);
  });
  it('départ : règlement OU dérogation motivée', () => {
    expect(departAutorise(expedition())).toBe(false);
    expect(departAutorise(expedition({ reglementRecu: true }))).toBe(true);
    expect(departAutorise(expedition({ derogationDepart: true }))).toBe(false);
    expect(departAutorise(expedition({ derogationDepart: true, derogationMotif: '  ' }))).toBe(false);
    expect(departAutorise(expedition({ derogationDepart: true, derogationMotif: 'Client fidèle' }))).toBe(true);
    expect(manquesDepart(expedition({ derogationDepart: true }))).toEqual(['le motif de la dérogation de départ']);
  });
  it('conversion : statut 3 requis', () => {
    expect(manquesConversion(demande({ statut: 2 }))).toHaveLength(1);
    expect(manquesConversion(demande({ statut: 3 }))).toEqual([]);
  });
});

describe('fusion', () => {
  it('null vide un champ, le reste écrase', () => {
    const f = fusionner(demande({ notes: 'a', delaiEstime: '3 semaines' }), { notes: null, montantHT: 10 });
    expect(f.notes).toBeUndefined();
    expect('notes' in f).toBe(false);
    expect(f.montantHT).toBe(10);
    expect(f.delaiEstime).toBe('3 semaines');
  });
  it('ne modifie pas le document d’origine', () => {
    const d = demande({ notes: 'a' });
    fusionner(d, { notes: 'b' });
    expect(d.notes).toBe('a');
  });
  it('champs réellement modifiés', () => {
    const d = demande({ notes: 'a', delaiEstime: '' });
    expect(champsModifies(d, { notes: 'a', delaiEstime: null, montantHT: 5, descriptionPrestation: '' })).toEqual([
      'montantHT',
    ]);
  });
  it('champs modifiés d’un dossier (champ défini nulle part)', () => {
    const dos = dossierExpedition({ colisNature: 'a' });
    expect(champsModifiesDossier(dos, { colisNature: 'a', colisNombre: 3, mode: null })).toEqual(['colisNombre']);
  });
});

describe('actionPrincipale (4.3)', () => {
  const principale = (dossier = dossierDemande(), brouillon = {}) => actionPrincipale(dossier, brouillon);

  it('nouvelle demande : prendre en charge', () => {
    expect(principale(dossierDemande({ statut: 0 }))).toMatchObject({ id: 'prendreEnCharge', manques: [] });
  });
  it('à chiffrer sans montant : demander des compléments (actif), fenêtre complément', () => {
    const a = principale(dossierDemande({ statut: 1 }));
    expect(a).toMatchObject({ id: 'demanderComplements', ouvre: 'complement', manques: [] });
    expect(a.phrase).toContain('le montant HT');
  });
  it('à chiffrer sans e-mail : compléments bloqués avec la raison', () => {
    expect(principale(dossierDemande({ statut: 1, email: undefined })).manques).toHaveLength(1);
  });
  it('à chiffrer avec montant : envoyer le devis, fenêtre d’envoi', () => {
    const d = dossierDemande({ statut: 1, montantHT: 1250, tauxTVA: 20, descriptionPrestation: 'Groupage' });
    expect(principale(d)).toMatchObject({ id: 'envoyerDevis', ouvre: 'envoi', manques: [] });
  });
  it('les manques reflètent le brouillon, pas le seul document enregistré', () => {
    const d = dossierDemande({ statut: 1, montantHT: 1250, tauxTVA: 20 });
    expect(principale(d).manques).toEqual(['la description de la prestation']);
    const a = principale(d, { descriptionPrestation: 'Groupage' });
    expect(a.manques).toEqual([]);
    expect(a.libelle).toBe('Enregistrer et envoyer le devis');
    // un brouillon qui vide un champ requis alors que l’enregistré est complet
    const complet = dossierDemande({ statut: 1, montantHT: 1250, tauxTVA: 20, descriptionPrestation: 'x' });
    expect(principale(complet, { montantHT: null }).manques).toEqual(['le montant HT']);
    expect(principale(complet, { montantHT: null, tauxTVA: null }).id).toBe('demanderComplements');
  });
  it('devis parti : terminer l’enregistrement, jamais envoyer le devis', () => {
    const a = principale(dossierDemande({ statut: 1, devisEnvoyeLe: '05/11/2026 à 14h02', montantHT: 1, tauxTVA: 0 }));
    expect(a).toMatchObject({ id: 'terminerEnvoi', libelle: "Terminer l'enregistrement de l'envoi" });
    expect(a.ouvre).toBeUndefined();
    expect(a.id).not.toBe('envoyerDevis');
  });
  it('devis envoyé et hors outil : le client a accepté', () => {
    expect(principale(dossierDemande({ statut: 2 })).id).toBe('accepter');
    expect(principale(dossierDemande({ statut: 2, devisEnvoyeHorsOutilLe: '05/11/2026' })).id).toBe('accepter');
  });
  it('accepté : créer l’expédition avec confirmation', () => {
    const a = principale(dossierDemande({ statut: 3 }));
    expect(a.id).toBe('creerExpedition');
    expect(a.confirmation?.verbe).toBeTruthy();
  });
  it('à préparer : déclencher, avec les 7 manques puis aucun grâce au brouillon', () => {
    const d = dossierExpedition();
    expect(principale(d).manques).toHaveLength(7);
    const b = {
      expediteurAdresse: 'a',
      destinataireNom: 'b',
      destinataireAdresse: 'c',
      colisNature: 'd',
      colisNombre: 3,
      colisVolume: 2,
      mode: 'Groupage maritime',
    };
    const a = principale(d, b);
    expect(a.manques).toEqual([]);
    expect(a.libelle).toBe('Enregistrer et déclencher la prise en charge');
    expect(a.confirmation).toBeTruthy();
  });
  it('prêt : marquer expédié exige règlement ou dérogation', () => {
    expect(principale(dossierExpedition({ statutPriseEnCharge: 1 })).manques).toHaveLength(1);
    expect(principale(dossierExpedition({ statutPriseEnCharge: 1, reglementRecu: true })).manques).toEqual([]);
  });
  it('en route : étape suivante, puis marquer livré', () => {
    expect(principale(dossierExpedition({ statutPriseEnCharge: 2, etape: 1 }))).toMatchObject({
      id: 'avancerSuivi',
      libelle: 'Étape suivante : En mer',
      ouvre: 'suivi',
    });
    expect(principale(dossierExpedition({ statutPriseEnCharge: 2, etape: 3 }))).toMatchObject({
      id: 'marquerLivre',
      ouvre: 'suivi',
    });
  });
  it('incident : reprendre ; annulé et sans suite : rouvrir ; livré : aucune', () => {
    expect(principale(dossierExpedition({ statutPriseEnCharge: 4 }))).toMatchObject({ id: 'reprendre', ouvre: 'reprise' });
    expect(principale(dossierExpedition({ statutPriseEnCharge: 5 })).id).toBe('rouvrir');
    expect(principale(dossierDemande({ statut: 5 })).id).toBe('rouvrir');
    expect(principale(dossierExpedition({ statutPriseEnCharge: 3 })).id).toBe('aucune');
  });
});
