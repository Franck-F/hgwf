import { describe, expect, it } from 'vitest';
import imageLoader from './image-loader';

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
