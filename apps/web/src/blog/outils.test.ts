import { describe, expect, it } from 'vitest';
import { dateLisible, jsonLdInjectable } from './outils';
import { nettoyerHtmlArticle } from './nettoyage';

describe('blog', () => {
  it('jsonLdInjectable : réécrit le JSON et neutralise « </script> »', () => {
    expect(jsonLdInjectable('{"a":"</script><script>alert(1)</script>"}')).toBe('{"a":"\\u003c/script>\\u003cscript>alert(1)\\u003c/script>"}');
    expect(jsonLdInjectable('pas du json')).toBeNull();
    expect(jsonLdInjectable('42')).toBeNull();
    expect(jsonLdInjectable(null)).toBeNull();
  });

  it('dateLisible : date française ou anglaise, vide si illisible', () => {
    expect(dateLisible('fr', '2026-11-19T08:00:00Z')).toBe('19 novembre 2026');
    expect(dateLisible('en', '2026-11-19T08:00:00Z')).toBe('November 19, 2026');
    expect(dateLisible('fr', 'n’importe quoi')).toBe('');
  });

  it('nettoyerHtmlArticle : retire script, événements et liens javascript', () => {
    const sortie = nettoyerHtmlArticle('<h1>T</h1><p onmouseover="x()">a</p><script>alert(1)</script><a href="javascript:alert(1)">j</a><img src="https://x/i.png" onerror="x()"><iframe src="https://x"></iframe>');
    expect(sortie).not.toMatch(/script|onmouseover|onerror|iframe|javascript:/i);
    expect(sortie).toContain('<h2>T</h2>');
    expect(sortie).toContain('<img src="https://x/i.png" loading="lazy" decoding="async" />');
    expect(nettoyerHtmlArticle('<img src="http://x/i.png"><a href="https://a.fr" target="_blank">e</a>')).toBe(
      '<img loading="lazy" decoding="async" /><a href="https://a.fr" target="_blank" rel="noopener noreferrer">e</a>',
    );
    // GHSA-jxwj-j7wr-gfrw (corrigé en 2.17.6) : pas de balise interdite qui ressurgit.
    expect(nettoyerHtmlArticle('<p></textarea/><img src=x onerror=alert(1)></p>')).not.toMatch(/onerror/);
  });
});
