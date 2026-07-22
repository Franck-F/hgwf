import { describe, it, expect } from 'vitest';
import { doitAfficher } from './decision';

describe('doitAfficher', () => {
  it('reste invisible tant que le dispositif est inactif', () => {
    expect(doitAfficher(false, null)).toBe(false);
    expect(doitAfficher(false, 'refuse')).toBe(false);
  });

  it('s’affiche une fois actif si aucun choix n’a été fait', () => {
    expect(doitAfficher(true, null)).toBe(true);
  });

  it('disparaît une fois le choix enregistré', () => {
    expect(doitAfficher(true, 'accepte')).toBe(false);
    expect(doitAfficher(true, 'refuse')).toBe(false);
  });

  it('s’affiche de nouveau si la valeur stockée est inexploitable', () => {
    expect(doitAfficher(true, 'n’importe quoi')).toBe(true);
  });
});
