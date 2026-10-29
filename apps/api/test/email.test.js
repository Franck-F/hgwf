// Gabarit HTML des e-mails : mise en forme du texte et étanchéité au HTML.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gabaritHtml } from '../src/email.js';

test('une liste à puces devient un tableau de puces, sans <ul>', () => {
  const h = gabaritHtml({ titre: 'T', paragraphes: ['Intro courte :\n- un\n- deux'] });
  assert.equal((h.match(/&bull;/g) ?? []).length, 2);
  assert.doesNotMatch(h, /<ul|<li/);
  assert.match(h, /font-weight:700;color:#063565;">Intro courte :</);
});

test('une longue phrase finissant par « : » reste du texte courant', () => {
  const h = gabaritHtml({ titre: 'T', paragraphes: ['Pour vous établir un prix exact, il nous manque quelques informations :\n- a'] });
  assert.match(h, /line-height:26px;color:#45566a;">Pour vous établir/);
});

test('encadre : fond crème et filet corail seulement sur les listes', () => {
  const avec = gabaritHtml({ titre: 'T', paragraphes: ['- a\n- b'], encadre: true });
  const sans = gabaritHtml({ titre: 'T', paragraphes: ['- a\n- b'] });
  assert.match(avec, /border-left:4px solid #fd7f5a/);
  assert.doesNotMatch(sans, /border-left:4px/);
});

test('retours à la ligne conservés dans un paragraphe', () => {
  const h = gabaritHtml({ titre: 'T', paragraphes: ['Bien cordialement,\nL’équipe'] });
  assert.match(h, /Bien cordialement,<br>L’équipe/);
});

test('aucune injection HTML : titre, texte, puces, récapitulatif', () => {
  const piege = '<script>alert(1)</script>';
  const h = gabaritHtml({
    titre: piege,
    paragraphes: [piege, `Libellé ${piege} :\n- ${piege}`],
    lignes: [[piege, piege]],
    paragraphesApres: [piege],
    encadre: true,
  });
  assert.doesNotMatch(h, /<script/);
  assert.match(h, /&lt;script&gt;/);
});

test('les appelants existants restent compatibles : récapitulatif et paragraphes après', () => {
  const h = gabaritHtml({
    titre: 'Votre devis est prêt',
    paragraphes: ['Bonjour Marie,', 'Voici votre devis.'],
    lignes: [['Montant HT', '100 €'], ['Total TTC', '120 €']],
    paragraphesApres: ['Détail de la prestation :\nCompris : transport\nNon compris : douane'],
  });
  assert.match(h, /Montant HT/);
  assert.match(h, /120 €/);
  assert.ok(h.indexOf('Montant HT') < h.indexOf('Détail de la prestation'));
  assert.match(h, /tel:\+33962038013/);
});
