/**
 * Aligne l'identité légale des documents de production sur le registre du
 * commerce (SIREN 940048051) et purge les caractères invisibles de la ligne
 * légale du pied de page.
 *
 * Peuple aussi footer.liensLegaux : en production ce champ est vide et
 * footer.mentionsHref vaut /mentions-legales, ce qui fait retomber le pied de
 * page (chaîne de repli liensLegaux → ancien lien unique → valeurs par
 * défaut du code) sur le seul lien « Mentions légales ». Les pages
 * confidentialité et CGV resteraient sinon inaccessibles depuis le footer.
 *
 * Corrige aussi, si pageLegale-mentions-fr existe déjà, ses champs
 * seoTitre/seoDescription — migrer-pages-legales.ts impose désormais ces
 * mêmes valeurs à la création du document, mais si ce script est rejoué sur
 * une base déjà migrée (où le document existe et ne sera donc pas recréé),
 * il faut aussi les réappliquer ici pour que l'état final soit identique
 * qu'on parte d'une base vierge ou d'une base déjà migrée.
 *
 * Garde-fou : siteSettings et footer doivent déjà exister (le script ne les
 * crée pas) ; le script s'arrête avant toute écriture si l'un des deux est
 * introuvable.
 *
 * Exécution (depuis apps/studio) :
 *   npx sanity exec scripts/corriger-identite.ts --with-user-token
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2024-10-01' });
const INVISIBLES = /[​-‏⁠-⁯﻿]/g;

const RAISON_SOCIALE = 'HGWF CARGO';
const ADRESSE_SIEGE = 'Avenue Faidherbe, 93110 Rosny-sous-Bois';
const LIGNE_LEGALE =
  'HGWF CARGO · AVENUE FAIDHERBE\n93110 ROSNY-SOUS-BOIS · 940 048 051 R.C.S. BOBIGNY · TVA FR18940048051';

const LIENS_LEGAUX = [
  { _key: 'legal-mentions', libelleFr: 'Mentions légales', libelleEn: 'Legal notice', href: '/mentions-legales' },
  {
    _key: 'legal-confidentialite',
    libelleFr: 'Politique de confidentialité',
    libelleEn: 'Privacy policy',
    href: '/confidentialite',
  },
  { _key: 'legal-cgv', libelleFr: 'CGV', libelleEn: 'Terms of sale', href: '/cgv' },
];

// Mêmes valeurs que celles imposées par migrer-pages-legales.ts (SEO_DESCRIPTION_CORRIGEE) —
// l'ancien seoDescription portait la dénomination erronée « HGWF Solutions Transports
// Logistiques », absente du registre du commerce.
const SEO_TITRE_MENTIONS = 'Mentions légales — HGWF Cargo';
const SEO_DESCRIPTION_MENTIONS = 'Mentions légales du site HGWF Cargo — éditeur, immatriculation et hébergeur.';

async function main() {
  // Garde-fou : siteSettings et footer sont patchés ci-dessous sans être créés par ce script.
  // On vérifie donc leur existence avant toute écriture, comme le fait déjà
  // migrer-pages-legales.ts pour sa propre cible.
  const requis = ['siteSettings', 'footer'] as const;
  const trouves = await client.fetch<{ _id: string; ligneLegale?: string }[]>(
    '*[_id in $ids]{_id, ligneLegale}',
    { ids: requis },
  );
  const parId = new Map(trouves.map((d) => [d._id, d]));
  const manquants = requis.filter((id) => !parId.has(id));
  if (manquants.length > 0) {
    console.error(
      `Document(s) introuvable(s) : ${manquants.join(', ')}. Ce script corrige des documents ` +
        `existants, il ne les crée pas. Correction interrompue avant toute écriture.`,
    );
    process.exit(1);
  }

  const invisibles = (parId.get('footer')?.ligneLegale ?? '').match(INVISIBLES)?.length ?? 0;
  console.log(`ligneLegale : ${invisibles} caractères invisibles à retirer`);

  await client.patch('siteSettings').set({ raisonSociale: RAISON_SOCIALE, adresseSiege: ADRESSE_SIEGE }).commit();
  console.log('  ✓ siteSettings (raisonSociale, adresseSiege)');

  await client.patch('footer').set({ ligneLegale: LIGNE_LEGALE, liensLegaux: LIENS_LEGAUX }).commit();
  console.log('  ✓ footer (ligneLegale, liensLegaux : mentions légales, confidentialité, CGV)');

  // pageLegale-mentions-fr n'existe pas forcément (base vierge pas encore migrée) : on ne le
  // corrige que s'il existe déjà, sans en faire une condition d'échec du script.
  const pageMentions = await client.fetch<{ _id: string } | null>('*[_id == "pageLegale-mentions-fr"][0]{_id}');
  if (pageMentions) {
    await client
      .patch('pageLegale-mentions-fr')
      .set({ seoTitre: SEO_TITRE_MENTIONS, seoDescription: SEO_DESCRIPTION_MENTIONS })
      .commit();
    console.log('  ✓ pageLegale-mentions-fr (seoTitre, seoDescription)');
  } else {
    console.log('  · pageLegale-mentions-fr introuvable — pas encore migré, rien à corriger ici.');
  }

  console.log('Correction terminée.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
