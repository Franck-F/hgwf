type LoaderArgs = { src: string; width: number; quality?: number };

// Largeurs pré-générées par scripts/variantes-photos.mjs — garder alignées.
export const LARGEURS_PHOTOS = [480, 800, 1200] as const;

export default function imageLoader({ src, width, quality }: LoaderArgs): string {
  // Photos locales : l'hébergement statique ne redimensionne rien, on sert la
  // variante WebP pré-générée la plus proche au-dessus de la largeur demandée.
  const photo = /^\/photos\/([\w-]+)\.jpg$/.exec(src);
  if (photo) {
    const l = LARGEURS_PHOTOS.find((x) => x >= width) ?? LARGEURS_PHOTOS[LARGEURS_PHOTOS.length - 1];
    return `/photos/_w/${photo[1]}-${l}.webp`;
  }

  const [base, qs] = src.split('?');
  const params = new URLSearchParams(qs);
  params.set('w', String(width));
  params.set('q', String(quality ?? 75));
  params.set('auto', 'format');
  // Decode percent-encoded commas in param values (e.g. Sanity rect=0,0,100,100)
  const rawQs = params.toString().replace(/%2C/gi, ',');
  return `${base}?${rawQs}`;
}
