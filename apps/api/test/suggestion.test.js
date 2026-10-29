// Suggestions Gemini : anonymisation, consignes, bornes, lecture de la réponse.
// Aucun appel réseau : fetch est remplacé par un faux.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  anonymiser,
  construireRequete,
  demanderSuggestion,
  ficheEnTexte,
  validerSuggestion,
} from '../src/suggestion.js';

const demande = {
  typeEnvoi: 'Groupage (LCL)',
  destination: 'Martinique',
  volume: '3 m³',
  message: 'Appelez-moi au 06 12 34 56 78 ou +33 6 12 34 56 78, ou écrivez à jean.dupont@exemple.fr. IBAN FR76 3000 6000 0112 3456 7890 189.',
};

test('anonymisation : ni e-mail, ni téléphone, ni IBAN ne partent', () => {
  const t = anonymiser(demande.message);
  assert.ok(!t.includes('06 12'));
  assert.ok(!t.includes('+33'));
  assert.ok(!t.includes('jean.dupont'));
  assert.ok(!t.includes('FR76'));
  // Un volume ou une date ne sont pas des numéros de téléphone.
  assert.equal(anonymiser('3 m³ le 12/11, 20 cartons'), '3 m³ le 12/11, 20 cartons');
});

test('la requête ne contient que la demande anonymisée et la fiche', () => {
  const req = construireRequete({ champ: 'montant', demande, fiche: null });
  const texte = JSON.stringify(req);
  assert.ok(!texte.includes('jean.dupont'));
  assert.ok(texte.includes('AUCUNE FICHE SERVICE'));
  assert.ok(texte.includes('n’inventes ni prix'));
  assert.equal(req.generationConfig.responseMimeType, 'application/json');
  assert.ok(req.generationConfig.responseSchema.properties.montantHT);
  assert.throws(() => construireRequete({ champ: 'objet', demande }), /champ inconnu/);
});

test('fiche en texte : un prix absent est signalé, jamais laissé à deviner', () => {
  const t = ficheEnTexte({
    titre: 'Groupage',
    grille: [
      { designation: 'Fret', unite: 'm³', prixHT: 150 },
      { designation: 'Enlèvement', unite: 'envoi' },
    ],
    tauxTVADefaut: 0,
    delais: [{ zone: 'Antilles', delai: '3 à 5 semaines' }],
  });
  assert.ok(t.includes('Fret (par m³) : 150 € HT'));
  assert.ok(t.includes('Enlèvement (par envoi) : PRIX NON RENSEIGNÉ'));
  assert.ok(t.includes('Taux de TVA habituel : 0 %'));
  assert.ok(t.includes('Antilles : 3 à 5 semaines'));
});

test('validation : bornes du montant et du taux', () => {
  assert.deepEqual(validerSuggestion('montant', { montantHT: 500.004, tauxTVA: 0, calcul: 'x', manques: [] }), {
    montantHT: 500, tauxTVA: 0, calcul: 'x', manques: [],
  });
  const faux = validerSuggestion('montant', { montantHT: -3, tauxTVA: 7, calcul: 12, manques: ['', 'prix'] });
  assert.equal(faux.montantHT, null);
  assert.equal(faux.tauxTVA, null, 'un taux hors liste ne passe pas');
  assert.deepEqual(faux.manques, ['prix']);
  assert.equal(validerSuggestion('montant', { montantHT: null, tauxTVA: null }).montantHT, null);
  assert.deepEqual(validerSuggestion('notes', { texte: '  - a  ', manques: null }), { texte: '- a', manques: [] });
});

const faux = (statut, corps) => async () => ({ ok: statut < 400, status: statut, json: async () => corps });

test('lecture de la réponse : la pensée est ignorée, le JSON final est lu', async () => {
  const r = await demanderSuggestion({
    cle: 'x',
    requete: {},
    fetchImpl: faux(200, {
      candidates: [{ content: { parts: [{ text: 'je réfléchis', thought: true }, { text: '{"texte":"ok","manques":[]}' }] } }],
    }),
  });
  assert.deepEqual(r, { texte: 'ok', manques: [] });
});

test('erreurs : statut HTTP remonté, réponse vide refusée', async () => {
  await assert.rejects(demanderSuggestion({ cle: 'x', requete: {}, fetchImpl: faux(429, {}) }), (e) => e.statut === 429);
  await assert.rejects(demanderSuggestion({ cle: 'x', requete: {}, fetchImpl: faux(200, { candidates: [] }) }), /réponse vide/);
});
