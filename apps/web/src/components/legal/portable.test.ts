import { describe, it, expect } from 'vitest';
import { p, titre3, liste, lien } from './portable';

describe('portable', () => {
  it('construit un paragraphe de texte simple', () => {
    const bloc = p('Bonjour');
    expect(bloc._type).toBe('block');
    expect(bloc.style).toBe('normal');
    expect(bloc.children).toEqual([{ _type: 'span', _key: expect.any(String), text: 'Bonjour', marks: [] }]);
    expect(bloc.markDefs).toEqual([]);
  });

  it('construit un paragraphe contenant un lien', () => {
    const bloc = p('Écrivez à ', lien('contact@hgwf-cargo.fr', 'mailto:contact@hgwf-cargo.fr'), '.');
    expect(bloc.markDefs).toHaveLength(1);
    expect(bloc.markDefs[0]!._type).toBe('link');
    expect(bloc.markDefs[0]!.href).toBe('mailto:contact@hgwf-cargo.fr');
    expect(bloc.children.map((c) => c.text)).toEqual(['Écrivez à ', 'contact@hgwf-cargo.fr', '.']);
    expect(bloc.children[1]!.marks).toEqual([bloc.markDefs[0]!._key]);
  });

  it('construit un titre de niveau 3', () => {
    expect(titre3('Vos droits').style).toBe('h3');
  });

  it('construit une liste à puces', () => {
    const blocs = liste('Accès', 'Rectification');
    expect(blocs).toHaveLength(2);
    expect(blocs[0]!.listItem).toBe('bullet');
    expect(blocs[1]!.children[0]!.text).toBe('Rectification');
  });

  it('donne une clé unique à chaque bloc', () => {
    const cles = [p('a'), p('b'), ...liste('c', 'd')].map((b) => b._key);
    expect(new Set(cles).size).toBe(4);
  });
});
