import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import imageLoader, { LARGEURS_PHOTOS } from './image-loader';

describe('imageLoader (Sanity CDN)', () => {
  it('ajoute width, quality et auto=format à une URL Sanity', () => {
    const url = imageLoader({
      src: 'https://cdn.sanity.io/images/abc/production/img-123.jpg',
      width: 800,
      quality: 70,
    });
    expect(url).toContain('w=800');
    expect(url).toContain('q=70');
    expect(url).toContain('auto=format');
  });

  it('utilise quality 75 par défaut', () => {
    const url = imageLoader({ src: 'https://cdn.sanity.io/images/abc/production/img-123.jpg', width: 400 });
    expect(url).toContain('q=75');
  });

  it('préserve les paramètres existants (ex. hotspot rect)', () => {
    const url = imageLoader({ src: 'https://cdn.sanity.io/images/abc/production/img-123.jpg?rect=0,0,100,100', width: 400 });
    expect(url).toContain('rect=0,0,100,100');
    expect(url).toContain('w=400');
  });
});

describe('imageLoader (photos locales)', () => {
  it('sert la variante WebP pré-générée juste au-dessus de la largeur demandée', () => {
    expect(imageLoader({ src: '/photos/entrepot.jpg', width: 640 })).toBe('/photos/_w/entrepot-800.webp');
    expect(imageLoader({ src: '/photos/entrepot.jpg', width: 384 })).toBe('/photos/_w/entrepot-480.webp');
  });

  it('plafonne à la plus grande variante', () => {
    expect(imageLoader({ src: '/photos/groupage.jpg', width: 3840 })).toBe('/photos/_w/groupage-1200.webp');
  });

  it('chaque photo locale a toutes ses variantes', () => {
    const dossier = join(__dirname, '../../public/photos');
    for (const f of readdirSync(dossier).filter((x) => x.endsWith('.jpg'))) {
      for (const l of LARGEURS_PHOTOS) {
        expect(existsSync(join(dossier, '_w', `${f.replace(/\.jpg$/, '')}-${l}.webp`))).toBe(true);
      }
    }
  });
});
