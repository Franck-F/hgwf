import { describe, it, expect } from 'vitest';
import { nettoyerInvisibles } from './nettoyerInvisibles';

describe('nettoyerInvisibles', () => {
  it('retire les espaces de largeur nulle', () => {
    expect(nettoyerInvisibles('HGWF​‌‍﻿CARGO')).toBe('HGWFCARGO');
  });

  it('laisse le texte normal intact, sauts de ligne compris', () => {
    expect(nettoyerInvisibles('A · B\nC')).toBe('A · B\nC');
  });

  it('tolère une valeur vide', () => {
    expect(nettoyerInvisibles('')).toBe('');
  });
});
