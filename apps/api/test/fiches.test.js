// Fiches services du back-office : rattachement d'une demande à sa fiche.
// Le Studio n'a pas d'outil de test : Node exécute directement fiches.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ficheDe, normaliser, prixManquants, remplirModele } from '../../studio/tools/backoffice/fiches.ts';
import { FICHES } from '../../studio/seed/fichesServices.mjs';

test('normalisation : casse, accents, apostrophes, barres et espaces ignorés', () => {
  assert.equal(normaliser('  Véhicule  /  Bateau '), 'vehicule/bateau');
  assert.equal(normaliser('Conteneur d’occasion'), normaliser("conteneur d'occasion"));
  assert.equal(normaliser(undefined), '');
});

// Ce que le site envoie réellement dans typeEnvoi (DevisWizard en FR et EN,
// sujets du formulaire de contact), et la fiche attendue.
const ATTENDUS = {
  'Groupage (LCL)': 'fiche-groupage',
  'Conteneur complet (FCL)': 'fiche-fcl',
  'Full container (FCL)': 'fiche-fcl',
  'Véhicule / bateau': 'fiche-vehicule',
  'Vehicle / boat': 'fiche-vehicule',
  Déménagement: 'fiche-demenagement',
  Removal: 'fiche-demenagement',
  'Déménagement Outre-mer': 'fiche-demenagement',
  'Overseas removal': 'fiche-demenagement',
  'Transport de conteneur': 'fiche-transport-conteneur',
  'Container transport': 'fiche-transport-conteneur',
  'Fret aérien': 'fiche-fret-aerien',
  'Air freight': 'fiche-fret-aerien',
  'Entrepôt & box de stockage': 'fiche-stockage',
  'Warehouse & storage boxes': 'fiche-stockage',
  "Conteneur d'occasion": 'fiche-conteneur-occasion',
  'Used container': 'fiche-conteneur-occasion',
};

test('chaque libellé du site retrouve sa fiche de départ', () => {
  for (const [typeEnvoi, id] of Object.entries(ATTENDUS)) {
    assert.equal(ficheDe({ typeEnvoi }, FICHES).fiche?._id, id, typeEnvoi);
  }
  // Sujets sans service : pas de fiche, plutôt qu'une mauvaise.
  for (const typeEnvoi of ['Demande de devis', "Suivi d'un envoi", 'Autre question', 'Demande via le site', '']) {
    assert.equal(ficheDe({ typeEnvoi }, FICHES).fiche, null, typeEnvoi);
  }
});

test('un choix manuel l’emporte, sauf si la fiche a disparu', () => {
  const choisie = ficheDe({ typeEnvoi: 'Groupage (LCL)', ficheService: { _ref: 'fiche-fcl' } }, FICHES);
  assert.equal(choisie.fiche?._id, 'fiche-fcl');
  assert.equal(choisie.manuel, true);
  const perdue = ficheDe({ typeEnvoi: 'Groupage (LCL)', ficheService: { _ref: 'fiche-supprimee' } }, FICHES);
  assert.equal(perdue.fiche?._id, 'fiche-groupage');
  assert.equal(perdue.manuel, false);
});

test('modèles : destination remplie, repli lisible', () => {
  assert.equal(remplirModele('Vers {destination}, puis {destination}.', { destination: ' Martinique ' }), 'Vers Martinique, puis Martinique.');
  assert.equal(remplirModele('Vers {destination}.', {}), 'Vers votre destination.');
  assert.equal(remplirModele(undefined, {}), '');
});

// Seuls les prix donnés par l'équipe figurent dans les fiches de départ ; tout
// autre prix serait inventé. À mettre à jour à chaque tarif communiqué.
const PRIX_SOURCES = { 'fiche-groupage': [400] }; // 29/10/2026, Franck : 400 €/m³

test('fiches de départ : aucun prix sans source, chaque grille a ses lignes', () => {
  for (const f of FICHES) {
    assert.ok((f.grille ?? []).length > 0, f._id);
    const prix = f.grille.filter((l) => typeof l.prixHT === 'number').map((l) => l.prixHT);
    assert.deepEqual(prix, PRIX_SOURCES[f._id] ?? [], `${f._id} : prix sans source`);
    assert.equal(prixManquants(f), f.grille.length - prix.length, f._id);
    assert.ok(Array.isArray(f.aCompleter) && f.aCompleter.length > 0, f._id);
  }
});
