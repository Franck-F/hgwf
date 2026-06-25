type LoaderArgs = { src: string; width: number; quality?: number };

export default function imageLoader({ src, width, quality }: LoaderArgs): string {
  const [base, qs] = src.split('?');
  const params = new URLSearchParams(qs);
  params.set('w', String(width));
  params.set('q', String(quality ?? 75));
  params.set('auto', 'format');
  // Decode percent-encoded commas in param values (e.g. Sanity rect=0,0,100,100)
  const rawQs = params.toString().replace(/%2C/gi, ',');
  return `${base}?${rawQs}`;
}
