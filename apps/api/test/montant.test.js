// Montant du devis : règles de calcul et parité avec le back-office.
// Lancement : pnpm --filter api test (Node ≥ 23 exécute le .ts du Studio en
// effaçant ses types, sans compilation).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../src/montant.js';
import * as studio from '../../studio/tools/backoffice/chiffrage.ts';

const NBSP = ' ';

test('calcul en centimes entiers, TTC = HT + TVA arrondie', () => {
  assert.deepEqual(api.calculerChiffrage(1250, 20), { ht: 1250, taux: 20, tva: 250, ttc: 1500 });
  // 0,1 + 0,2 en flottant ne tombe pas juste : le calcul en centimes, si.
  assert.deepEqual(api.calculerChiffrage(0.3, 20), { ht: 0.3, taux: 20, tva: 0.06, ttc: 0.36 });
  // TVA arrondie au centime le plus proche : 10,05 × 20 % = 2,01.
  assert.deepEqual(api.calculerChiffrage(10.05, 20), { ht: 10.05, taux: 20, tva: 2.01, ttc: 12.06 });
});

test('le taux 0 % est un vrai taux, pas une absence', () => {
  assert.deepEqual(api.calculerChiffrage(980, 0), { ht: 980, taux: 0, tva: 0, ttc: 980 });
  assert.equal(api.aUnMontant({ montantHT: 980, tauxTVA: 0 }), true);
});

test('sans taux ou sans montant, pas de chiffrage', () => {
  assert.equal(api.calculerChiffrage(1250, undefined), null);
  assert.equal(api.calculerChiffrage(undefined, 20), null);
  assert.equal(api.calculerChiffrage(Number.NaN, 20), null);
  assert.equal(api.calculerChiffrage(-5, 20), null);
  assert.equal(api.aUnMontant({ montantHT: 1250 }), false);
  assert.equal(api.aUnMontant({ montantHT: 0, tauxTVA: 20 }), false, 'un devis à 0 € ne part pas');
  assert.equal(api.aUnMontant({}), false);
  assert.equal(api.aUnMontant(null), false);
});

test('format français, sans U+202F (illisible dans le PDF)', () => {
  assert.equal(api.euros(1250), `1${NBSP}250,00${NBSP}€`);
  assert.equal(api.euros(1234567.5), `1${NBSP}234${NBSP}567,50${NBSP}€`);
  assert.ok(!api.euros(1250).includes(' '));
  assert.equal(api.pourcentage(5.5), `5,5${NBSP}%`);
});

test('anciens documents : la chaîne libre est affichée telle quelle', () => {
  const ancien = { montantDevis: '  1 250 €  ' };
  assert.equal(api.aUnMontant(ancien), true);
  assert.deepEqual(api.lignesMontant(ancien), [['Montant', '1 250 €']]);
  assert.equal(api.montantAnnonce(ancien), '1 250 €');
  assert.equal(api.libelleMontant(ancien), '1 250 €');
  assert.equal(api.aUnMontant({ montantDevis: '   ' }), false);
  // Le montant structuré l'emporte sur l'ancienne chaîne.
  assert.equal(api.montantAnnonce({ montantHT: 100, tauxTVA: 20, montantDevis: '999 €' }), `120,00${NBSP}€ TTC`);
});

test('lignes, annonce et libellé', () => {
  const d = { montantHT: 1250, tauxTVA: 20 };
  assert.deepEqual(api.lignesMontant(d), [
    ['Montant HT', `1${NBSP}250,00${NBSP}€`],
    [`TVA 20${NBSP}%`, `250,00${NBSP}€`],
    ['Total TTC', `1${NBSP}500,00${NBSP}€`],
  ]);
  assert.equal(api.montantAnnonce(d), `1${NBSP}500,00${NBSP}€ TTC`);
  assert.equal(api.libelleMontant(d), `1${NBSP}500,00${NBSP}€ TTC (1${NBSP}250,00${NBSP}€ HT + TVA 20${NBSP}%)`);
  assert.equal(api.libelleMontant({ montantHT: 980, tauxTVA: 0 }), `980,00${NBSP}€ TTC (TVA 0${NBSP}%, exportation)`);
  assert.deepEqual(api.lignesMontant({}), []);
  assert.equal(api.montantAnnonce({}), null);
});

test('parité exacte avec le back-office (chiffrage.ts)', () => {
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
  for (const d of cas) {
    for (const f of ['aUnMontant', 'lignesMontant', 'montantAnnonce', 'libelleMontant']) {
      assert.deepEqual(studio[f](d), api[f](d), `${f}(${JSON.stringify(d)})`);
    }
    assert.deepEqual(
      studio.calculerChiffrage(d?.montantHT, d?.tauxTVA),
      api.calculerChiffrage(d?.montantHT, d?.tauxTVA),
    );
  }
  assert.deepEqual(studio.TAUX_TVA, api.TAUX_TVA);
  assert.equal(studio.MENTION_EXONERATION, api.MENTION_EXONERATION);
});

test('saisie du back-office : espaces, virgule, euro, vide ≠ zéro', () => {
  assert.equal(studio.lireMontantSaisi('1 250,50'), 1250.5);
  assert.equal(studio.lireMontantSaisi(`1${NBSP}250 €`), 1250);
  assert.equal(studio.lireMontantSaisi('1 250,5'), 1250.5);
  assert.equal(studio.lireMontantSaisi('1250.555'), 1250.56);
  assert.equal(studio.lireMontantSaisi('0'), 0);
  assert.equal(studio.lireMontantSaisi(''), undefined);
  assert.equal(studio.lireMontantSaisi('   '), undefined);
  assert.ok(Number.isNaN(studio.lireMontantSaisi('12a')));
  assert.ok(Number.isNaN(studio.lireMontantSaisi('-5')));
  assert.ok(Number.isNaN(studio.lireMontantSaisi('1,2,3')));
  assert.equal(studio.montantVersSaisie(1250.5), '1250,50');
  assert.equal(studio.montantVersSaisie(undefined), '');
});

test('facturation : lignes, manques, SIRET', () => {
  const pro = {
    facturationType: 'professionnel',
    facturationNom: 'SARL Antilles Import',
    facturationAdresse: '12 rue du Port\nBâtiment B',
    facturationCodePostal: '97200',
    facturationVille: 'Fort-de-France',
    facturationPays: 'Martinique',
    facturationSiret: '12345678900012',
    facturationTvaIntracom: 'FR12345678901',
  };
  assert.deepEqual(studio.lignesFacturation(pro), [
    'SARL Antilles Import',
    '12 rue du Port',
    'Bâtiment B',
    '97200 Fort-de-France',
    'Martinique',
    'SIRET 12345678900012',
    'TVA intracom. FR12345678901',
  ]);
  assert.deepEqual(studio.manquesFacturation(pro), []);
  assert.deepEqual(studio.manquesFacturation({ facturationType: 'professionnel' }), [
    'raison sociale', 'adresse', 'code postal', 'ville', 'pays', 'SIRET',
  ]);
  // Un particulier n'a pas de SIRET à fournir, et on ne l'imprime pas s'il traîne.
  const part = { ...pro, facturationType: 'particulier', facturationNom: 'Marie Dupont' };
  assert.deepEqual(studio.manquesFacturation(part), []);
  assert.ok(!studio.lignesFacturation(part).some((l) => l.startsWith('SIRET')));
  assert.deepEqual(studio.manquesFacturation(null)[0], 'type de client');
  assert.equal(studio.erreurSiret(''), null);
  assert.equal(studio.erreurSiret('123 456 789'), null);
  assert.equal(studio.erreurSiret('123 456 789 00012'), null);
  assert.ok(studio.erreurSiret('12345'));
});
