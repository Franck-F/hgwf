// Génère les variantes WebP des photos locales (public/photos/*.jpg) dans
// public/photos/_w/<nom>-<largeur>.webp.
//
// Pourquoi : le site est un export statique servi par Apache (OVH). Rien ne
// redimensionne les images à la volée — les paramètres ?w=… du loader étaient
// ignorés et le navigateur recevait la photo pleine taille. Le loader
// (src/sanity/image-loader.ts) pointe désormais vers ces variantes.
//
// À relancer après tout ajout ou remplacement d'une photo :
//   node apps/web/scripts/variantes-photos.mjs
// Les largeurs doivent rester alignées sur LARGEURS_PHOTOS du loader.

import { createRequire } from 'node:module';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// sharp n'est pas une dépendance directe : on le résout depuis next, qui l'embarque.
const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [dirname(require.resolve('next/package.json'))] }));
sharp.cache(false);

const LARGEURS = [480, 800, 1200];
const racine = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'photos');
const sortie = join(racine, '_w');
mkdirSync(sortie, { recursive: true });

for (const fichier of readdirSync(racine).filter((f) => f.endsWith('.jpg'))) {
  const nom = fichier.replace(/\.jpg$/, '');
  const source = readFileSync(join(racine, fichier));
  const { width: native } = await sharp(source).metadata();
  for (const l of LARGEURS) {
    // Jamais d'agrandissement : au-delà de la taille native, on réutilise l'original.
    const tampon = await sharp(source)
      .resize({ width: Math.min(l, native), withoutEnlargement: true })
      .webp({ quality: 72, effort: 6 })
      .toBuffer();
    writeFileSync(join(sortie, `${nom}-${l}.webp`), tampon);
    console.log(`${nom}-${l}.webp  ${Math.round(tampon.length / 1024)} Ko`);
  }
}
