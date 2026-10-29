// Facturation pré-remplie depuis le formulaire du site.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { facturationDepuisFormulaire } from '../src/facturation.js';

test('rien de saisi : le nom du demandeur seul, type jamais deviné', () => {
  assert.deepEqual(facturationDepuisFormulaire('  Marie  Dupont ', undefined), { facturationNom: 'Marie Dupont' });
  assert.deepEqual(facturationDepuisFormulaire('Marie', { type: 'robot', siret: '123' }), { facturationNom: 'Marie' });
});

test('particulier complet', () => {
  assert.deepEqual(
    facturationDepuisFormulaire('Marie Dupont', {
      type: 'particulier',
      societe: 'ignorée',
      siret: '12345678900012',
      adresse: ' 12 rue du Port ',
      codePostal: '97200',
      ville: 'Fort-de-France',
      pays: 'Martinique',
    }),
    {
      facturationType: 'particulier',
      facturationNom: 'Marie Dupont',
      facturationAdresse: '12 rue du Port',
      facturationCodePostal: '97200',
      facturationVille: 'Fort-de-France',
      facturationPays: 'Martinique',
    },
  );
});

test('professionnel : raison sociale facturée, SIRET sans espaces', () => {
  const f = facturationDepuisFormulaire('Jean Martin', { type: 'professionnel', societe: 'SARL Antilles Import', siret: '123 456 789 00012' });
  assert.equal(f.facturationType, 'professionnel');
  assert.equal(f.facturationNom, 'SARL Antilles Import');
  assert.equal(f.facturationSiret, '12345678900012');
  // Sans raison sociale, le nom du demandeur.
  assert.equal(facturationDepuisFormulaire('Jean Martin', { type: 'professionnel' }).facturationNom, 'Jean Martin');
});

test('longueurs bornées', () => {
  const f = facturationDepuisFormulaire('x', { adresse: 'a'.repeat(1000), pays: 'p'.repeat(500) });
  assert.equal(f.facturationAdresse.length, 300);
  assert.equal(f.facturationPays.length, 80);
});
