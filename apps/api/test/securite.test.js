import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleValide, prenomAffichable, sansLien } from '../src/securite.js';

test('cleValide : vraie seulement pour la même clé, fausse si absente ou de longueur différente', () => {
  assert.equal(cleValide('abc123', 'abc123'), true);
  assert.equal(cleValide('abc124', 'abc123'), false);
  assert.equal(cleValide('abc', 'abc123'), false);
  assert.equal(cleValide(undefined, 'abc123'), false);
  assert.equal(cleValide('abc123', undefined), false);
  assert.equal(cleValide('', ''), false);
  assert.equal(cleValide(['abc123'], 'abc123'), false);
});

test('sansLien : retire liens, domaines nus et adresses, garde le reste', () => {
  assert.equal(sansLien('Haïti https://unpartage.online/fr/b2b/hgwf-cargo'), 'Haïti');
  assert.equal(sansLien('voir gopartage.online/fr/b2b ici'), 'voir ici');
  assert.equal(sansLien('www.exemple.com'), '');
  assert.equal(sansLien('écrire à pirate@exemple.fr'), 'écrire à');
  assert.equal(sansLien('Saint-Martin / Saint-Barthélemy'), 'Saint-Martin / Saint-Barthélemy');
  assert.equal(sansLien('≈ 1–3 m³ — Quelques cartons'), '≈ 1–3 m³ — Quelques cartons');
  assert.equal(sansLien(undefined), '');
});

test('prenomAffichable : un prénom plausible, sinon rien', () => {
  assert.equal(prenomAffichable('Marie-Laure Dupont'), 'Marie-Laure');
  assert.equal(prenomAffichable("N'Golo Kanté"), "N'Golo");
  assert.equal(prenomAffichable('http://piege.example Dupont'), '');
  assert.equal(prenomAffichable('Cliquez:www.piege.fr'), '');
  assert.equal(prenomAffichable(''), '');
});
