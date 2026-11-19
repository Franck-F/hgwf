import { describe, expect, it } from 'vitest';
import { dateLisible, jsonLdArticle, jsonLdInjectable } from './outils';
import { nettoyerHtmlArticle } from './nettoyage';

describe('blog', () => {
  it('jsonLdInjectable : réécrit le JSON et neutralise « </script> »', () => {
    expect(jsonLdInjectable('{"a":"</script><script>alert(1)</script>"}')).toBe('{"a":"\\u003c/script>\\u003cscript>alert(1)\\u003c/script>"}');
    expect(jsonLdInjectable('pas du json')).toBeNull();
    expect(jsonLdInjectable('42')).toBeNull();
    expect(jsonLdInjectable(null)).toBeNull();
  });

  it('jsonLdArticle : BlogPosting rattaché à l’organisation, sans « < »', () => {
    const j = JSON.parse(
      jsonLdArticle({ locale: 'fr', slug: 'demenagement', titre: 'Titre </script>', description: null, publieLe: '2026-11-16T00:00:00Z', imageUrl: null }),
    );
    expect(j['@type']).toBe('BlogPosting');
    expect(j.url).toBe('https://hgwf-cargo.fr/fr/blog/demenagement/');
    expect(j.publisher['@id']).toBe('https://hgwf-cargo.fr/#organisation');
    expect(j.description).toBeUndefined();
    expect(jsonLdArticle({ locale: 'fr', slug: 's', titre: '</script>', description: null, publieLe: 'x', imageUrl: null })).not.toContain('<');
  });

  it('dateLisible : date française ou anglaise, vide si illisible', () => {
    expect(dateLisible('fr', '2026-11-19T08:00:00Z')).toBe('19 novembre 2026');
    expect(dateLisible('en', '2026-11-19T08:00:00Z')).toBe('November 19, 2026');
    expect(dateLisible('fr', 'n’importe quoi')).toBe('');
  });

  it('retire le titre et l’image principale répétés en tête du contenu', () => {
    const brut = '<h1 id="t">Titre</h1> <p><img src="https://cdn/hero.jpg?a=1" alt="h"></p> <p>Intro</p><img src="https://cdn/autre.jpg">';
    const avecHero = nettoyerHtmlArticle(brut, 'https://cdn/hero.jpg?a=1');
    expect(avecHero).not.toContain('Titre');
    expect(avecHero).not.toContain('hero.jpg');
    expect(avecHero).toContain('autre.jpg');
    // Le paragraphe vidé disparaît, le paragraphe de texte reste.
    expect(avecHero).not.toMatch(/<p>\s*<\/p>/);
    expect(avecHero).toContain('<p>Intro</p>');
    // Sans image principale sur la page, on garde celle du contenu.
    expect(nettoyerHtmlArticle(brut, null)).toContain('hero.jpg');
  });

  it('nettoyerHtmlArticle : retire script, événements et liens javascript', () => {
    const sortie = nettoyerHtmlArticle('<h1>T</h1><h1>U</h1><p onmouseover="x()">a</p><script>alert(1)</script><a href="javascript:alert(1)">j</a><img src="https://x/i.png" onerror="x()"><iframe src="https://x"></iframe>');
    expect(sortie).not.toMatch(/script|onmouseover|onerror|iframe|javascript:/i);
    expect(sortie).toContain('<h2>U</h2>');
    expect(sortie).toContain('<img src="https://x/i.png" loading="lazy" decoding="async" />');
    expect(nettoyerHtmlArticle('<img src="http://x/i.png"><a href="https://a.fr" target="_blank">e</a>')).toBe(
      '<img loading="lazy" decoding="async" /><a href="https://a.fr" target="_blank" rel="noopener noreferrer">e</a>',
    );
    // GHSA-jxwj-j7wr-gfrw (corrigé en 2.17.6) : pas de balise interdite qui ressurgit.
    expect(nettoyerHtmlArticle('<p></textarea/><img src=x onerror=alert(1)></p>')).not.toMatch(/onerror/);
  });
});
