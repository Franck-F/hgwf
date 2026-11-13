/**
 * Fenêtre « Répondre » : objet de la réponse et salutation ajoutée côté outil.
 */
import { describe, expect, it } from 'vitest';
import { objetReponse, saluer } from '../../../views/Dossier/FenetreReponse';

describe('FenetreReponse', () => {
  it('objet « Re : … » sans empiler les préfixes', () => {
    expect(objetReponse('Re: RE : Votre devis HGWF-2026-7216')).toBe('Re : Votre devis HGWF-2026-7216');
    expect(objetReponse('TR: Fwd: Photos')).toBe('Re : Photos');
    expect(objetReponse('')).toBe('Votre demande de devis HGWF Cargo');
  });
  it('ajoute le nom du client à « Bonjour, » (le modèle ne le reçoit jamais)', () => {
    expect(saluer('Bonjour,\nMerci.', 'Philippe')).toBe('Bonjour Philippe,\nMerci.');
    expect(saluer('Bonjour,\nMerci.', '')).toBe('Bonjour,\nMerci.');
    expect(saluer('Madame,\nMerci.', 'Philippe')).toBe('Madame,\nMerci.');
  });
});
