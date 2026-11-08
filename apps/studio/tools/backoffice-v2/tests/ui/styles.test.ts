import { describe, expect, it } from 'vitest';
import { COULEURS_BADGES, FEUILLE_DE_STYLE } from '../../theme/styles';
import { COULEURS } from '../../theme/tokens';

/** Luminance relative WCAG. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contraste(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

describe('feuille de style', () => {
  it('le reset des boutons a une spécificité nulle (ni boutons pleins ni segments écrasés)', () => {
    // `.bo-racine button` (0,1,1) battait `.bo-bouton--primaire` (0,1,0) : boutons en texte nu.
    expect(FEUILLE_DE_STYLE).toMatch(/:where\(\.bo-racine\) button\{/);
    expect(FEUILLE_DE_STYLE).not.toContain('\n.bo-racine button{');
  });
  it('déclare les variables des jetons sur .bo-racine', () => {
    expect(FEUILLE_DE_STYLE).toContain('.bo-racine{');
    expect(FEUILLE_DE_STYLE).toContain(`--bo-marine:${COULEURS.marine}`);
    expect(FEUILLE_DE_STYLE).toContain('--bo-e6:40px');
  });
  it('ne contient ni position fixed, ni @import, ni police mono, ni emoji', () => {
    expect(FEUILLE_DE_STYLE).not.toMatch(/position:\s*fixed/);
    expect(FEUILLE_DE_STYLE).not.toContain('@import');
    expect(FEUILLE_DE_STYLE).not.toMatch(/monospace|Consolas|Courier/i);
    expect(FEUILLE_DE_STYLE).not.toMatch(/[✦✉☎⧉⏳✎✕]/u);
  });
  it('n’utilise aucune taille de texte sous 12 px', () => {
    const tailles = [...FEUILLE_DE_STYLE.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
    const raccourcis = [...FEUILLE_DE_STYLE.matchAll(/font:\s*(?:\d+\s+)?(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
    expect(tailles.length + raccourcis.length).toBeGreaterThan(10);
    expect(Math.min(...tailles, ...raccourcis)).toBeGreaterThanOrEqual(12);
  });
  it('garde un contraste d’au moins 4,5:1 sur chaque badge', () => {
    for (const [ton, c] of Object.entries(COULEURS_BADGES)) {
      expect(contraste(c.fond, c.texte), ton).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('garde un contraste suffisant pour le corail texte sur ivoire et le bouton plein', () => {
    expect(contraste(COULEURS.papier, COULEURS.corailTexte)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(COULEURS.marine, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});
