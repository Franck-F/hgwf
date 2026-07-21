/**
 * Migre pageMentions-fr vers pageLegale-mentions-fr.
 *
 * La section « Éditeur du site » n'est pas reprise : son contenu est erroné
 * (dénomination absente du RCS, établissement fermé en décembre 2025). Elle est
 * remplacée par l'identité du registre.
 *
 * Exécution (depuis apps/studio) :
 *   npx sanity exec scripts/migrer-pages-legales.ts --with-user-token   # plan seul
 *   CONFIRMER=1 npx sanity exec scripts/migrer-pages-legales.ts --with-user-token
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2024-10-01' });
const SOURCE = 'pageMentions-fr';
const CIBLE = 'pageLegale-mentions-fr';

let compteur = 0;
const cle = (p: string) => `${p}-${(compteur += 1).toString(36)}`;

type Bloc = {
  _type: 'block';
  _key: string;
  style: 'normal';
  children: { _type: 'span'; _key: string; text: string; marks: string[] }[];
  markDefs: never[];
};

// Une ligne de texte brut devient un paragraphe. Les lignes vides sont ignorées.
function enBlocs(texte: string): Bloc[] {
  return texte
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((ligne) => ({
      _type: 'block' as const,
      _key: cle('b'),
      style: 'normal' as const,
      children: [{ _type: 'span' as const, _key: cle('s'), text: ligne, marks: [] }],
      markDefs: [],
    }));
}

const EDITEUR_CORRIGE = enBlocs(
  [
    'HGWF CARGO, société par actions simplifiée.',
    'Siège social : avenue Faidherbe, 93110 Rosny-sous-Bois, France.',
    'Adresse logistique : 10 rue Diderot, 93110 Rosny-sous-Bois.',
    'Courriel : contact@hgwf-cargo.fr — Téléphone : +33 6 27 05 69 34.',
  ].join('\n'),
);

// Imposé, pas repris de la source : l'ancien seoDescription de pageMentions-fr contenait lui
// aussi la dénomination erronée « HGWF Solutions Transports Logistiques », absente du
// registre du commerce. Cette valeur avait été corrigée à la main directement en production,
// hors de tout script — ce qui la rendait invisible ici. On l'impose donc en dur pour que ce
// script redevienne la source de vérité et reste rejouable sans dépendre d'une correction
// manuelle non tracée.
const SEO_DESCRIPTION_CORRIGEE = 'Mentions légales du site HGWF Cargo — éditeur, immatriculation et hébergeur.';

const ancrer = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function main() {
  const source = await client.fetch<{
    eyebrow?: string;
    titrePage?: string;
    seoTitre?: string;
    seoDescription?: string;
    sections?: { titre?: string; corps?: string }[];
  } | null>(`*[_id == $id][0]`, { id: SOURCE });

  if (!source) {
    console.error(`${SOURCE} est introuvable — rien à migrer. Utiliser seed-pages-legales.ts à la place.`);
    process.exit(1);
  }

  const existante = await client.fetch<{ _id: string } | null>(`*[_id == $id][0]{_id}`, { id: CIBLE });
  if (existante) {
    console.error(`${CIBLE} existe déjà. Supprimer ce document avant de relancer la migration.`);
    process.exit(1);
  }

  const sections = (source.sections ?? []).map((s) => {
    const titre = s.titre ?? '';
    const remplace = titre.toLowerCase().startsWith('éditeur');
    return {
      _key: cle('sec'),
      titre,
      ancre: { _type: 'slug' as const, current: ancrer(titre) },
      corps: remplace ? EDITEUR_CORRIGE : enBlocs(s.corps ?? ''),
      _remplace: remplace,
    };
  });

  console.log(`Plan de migration ${SOURCE} → ${CIBLE}`);
  sections.forEach((s) => {
    const marque = s._remplace ? 'REMPLACÉE (identité corrigée)' : 'reprise';
    console.log(`  · ${s.titre} — ${marque}, ${s.corps.length} paragraphe(s)`);
  });

  // Garde-fou : toute la correction d'identité repose sur la détection de la section
  // « Éditeur du site » par son titre. Si aucun titre ne correspond (source restructurée,
  // renommée, etc.), le document serait créé sans cette correction — silencieusement, alors
  // que c'est le cœur de la migration. On arrête donc avant toute écriture, y compris en
  // simulation, pour que l'absence de correction ne passe jamais inaperçue.
  const remplacements = sections.filter((s) => s._remplace).length;
  if (remplacements === 0) {
    console.error(
      `\nAucune section « Éditeur » trouvée dans ${SOURCE} (titre attendu commençant par ` +
        `« éditeur »). La correction d'identité ne serait pas appliquée. Migration interrompue ` +
        `avant toute écriture, y compris en simulation.`,
    );
    process.exit(1);
  }

  if (process.env.CONFIRMER !== '1') {
    console.log('\nSimulation uniquement. Relancer avec CONFIRMER=1 pour écrire.');
    return;
  }

  await client.create({
    _id: CIBLE,
    _type: 'pageLegale',
    titre: 'Mentions légales',
    slug: { _type: 'slug', current: 'mentions-legales' },
    language: 'fr',
    eyebrow: source.eyebrow ?? 'Informations légales',
    titrePage: source.titrePage ?? 'Mentions légales.',
    dateMaj: new Date().toISOString().slice(0, 10),
    // seoTitre : valeur de la source vérifiée — « Mentions légales — HGWF Cargo » ne porte pas
    // la dénomination erronée, donc pas le même risque que seoDescription. Repris sans danger.
    seoTitre: source.seoTitre ?? 'Mentions légales — HGWF Cargo',
    // seoDescription : imposé, PAS repris de la source (voir SEO_DESCRIPTION_CORRIGEE
    // ci-dessus) — l'ancienne valeur portait la dénomination absente du registre du commerce.
    seoDescription: SEO_DESCRIPTION_CORRIGEE,
    sections: sections.map(({ _remplace, ...s }) => s),
  });

  console.log(`\n  ✓ ${CIBLE} créé. ${SOURCE} est conservé : le supprimer en tâche 11, après vérification en ligne.`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
