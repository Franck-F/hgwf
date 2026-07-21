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

async function main() {
  const avant = await client.fetch<{ ligneLegale?: string } | null>('*[_id == "footer"][0]{ligneLegale}');
  const invisibles = (avant?.ligneLegale ?? '').match(INVISIBLES)?.length ?? 0;
  console.log(`ligneLegale : ${invisibles} caractères invisibles à retirer`);

  await client.patch('siteSettings').set({ raisonSociale: RAISON_SOCIALE, adresseSiege: ADRESSE_SIEGE }).commit();
  console.log('  ✓ siteSettings (raisonSociale, adresseSiege)');

  await client.patch('footer').set({ ligneLegale: LIGNE_LEGALE, liensLegaux: LIENS_LEGAUX }).commit();
  console.log('  ✓ footer (ligneLegale, liensLegaux : mentions légales, confidentialité, CGV)');

  console.log('Correction terminée.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
