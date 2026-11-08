#!/usr/bin/env node
/**
 * Vérification de disjonction des lots (spécification 12.3 et critères 3 et 4).
 *
 * Usage, depuis apps/studio :  node tools/backoffice-v2/scripts/verifier-lots.mjs
 *
 * Contrôle :
 *  - chaque fichier de tools/backoffice-v2/ a UN propriétaire (table ci-dessous,
 *    première règle qui correspond) ; un fichier sans propriétaire fait échouer ;
 *  - aucun fichier ne dépasse 300 lignes ;
 *  - `from 'sanity'` seulement dans data/client.ts (et le faux module des essais),
 *    `from 'sanity/router'` seulement dans app/routeur.ts, jamais `@sanity/ui` ;
 *  - aucun window.confirm / prompt / alert dans le code (hors commentaires) ;
 *  - aucun `style={{` ni emoji d'interface interdit dans le code livré ;
 *  - l'étape client « Livré » (champ `etape`) n'est écrite que par planLivre (actions/regles.ts).
 *
 * Le dépôt n'étant pas versionné par git ici, « modifié par un lot qui ne le
 * possède pas » ne se mesure pas : le script prouve la partition (tout fichier a
 * un seul propriétaire), pas l'historique des écritures.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIMITE_LIGNES = 300;

// Première règle qui correspond = propriétaire. Les fichiers ajoutés hors de la
// liste d'origine sont rattachés au lot qui les a créés (voir les comptes rendus).
const REGLES = [
  [/^scripts\//, '14 Intégration'],
  [/^tests\/baseline\.md$/, '1 Socle'],
  [/^theme\/tokens\.ts$/, '1 Socle'],
  [/^ui\/types\.ts$/, '1 Socle'],
  [/^domaine\/(types|statuts|contrats|contratsActions|contratsHooks)\.ts$/, '1 Socle'],
  [/^tests\/domaine\/statuts\.test\.ts$/, '1 Socle'],
  [/^tests\/stubs\//, '1 Socle'],
  [/^(theme|ui)\//, '2 Kit d’interface'],
  [/^tests\/ui\//, '2 Kit d’interface'],
  [/^(domaine|pdf)\//, '3 Domaine'],
  [/^tests\/domaine\//, '3 Domaine'],
  [/^(data)\//, '6 Données'],
  [/^tests\/data\//, '6 Données'],
  [/^actions\//, '7 Actions'],
  [/^tests\/actions\//, '7 Actions'],
  [/^BackOffice\.tsx$/, '8 Coque'],
  [/^app\//, '8 Coque'],
  [/^tests\/app\//, '8 Coque'],
  [/^views\/(AFaire|Dossiers)\//, '9 À faire et Dossiers'],
  [/^tests\/views\/liste\//, '9 À faire et Dossiers'],
  [/^views\/Dossier\/devis\//, '11 Devis et envoi'],
  [/^tests\/views\/devis\//, '11 Devis et envoi'],
  [/^views\/Dossier\/expedition\//, '12 Expédition'],
  [/^tests\/views\/expedition\//, '12 Expédition'],
  [/^views\/Dossier\//, '10 Dossier, ossature'],
  [/^tests\/views\/dossier\//, '10 Dossier, ossature'],
  [/^views\/(Clients|Outils)\//, '13 Clients et Outils'],
  [/^tests\/views\/clients-outils\//, '13 Clients et Outils'],
];

function lister(dir) {
  return readdirSync(dir).flatMap((nom) => {
    const chemin = join(dir, nom);
    if (nom === 'node_modules') return [];
    return statSync(chemin).isDirectory() ? lister(chemin) : [chemin];
  });
}

// Retire les commentaires pour ne juger que le code (les en-têtes citent les
// interdits pour expliquer pourquoi ils le sont).
const sansCommentaires = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const erreurs = [];
const parLot = new Map();

for (const complet of lister(racine)) {
  const rel = relative(racine, complet).split(sep).join('/');
  const regle = REGLES.find(([motif]) => motif.test(rel));
  if (!regle) {
    erreurs.push(`${rel} : aucun propriétaire`);
    continue;
  }
  parLot.set(regle[1], (parLot.get(regle[1]) ?? 0) + 1);

  const src = readFileSync(complet, 'utf8');
  const lignes = src.split('\n').length;
  if (lignes > LIMITE_LIGNES) erreurs.push(`${rel} : ${lignes} lignes (limite ${LIMITE_LIGNES})`);

  if (!/\.(ts|tsx|mjs)$/.test(rel) || rel.startsWith('tests/') || rel.startsWith('scripts/')) continue;
  const code = sansCommentaires(src);

  if (/from ['"]sanity['"]/.test(code) && rel !== 'data/client.ts')
    erreurs.push(`${rel} : import de 'sanity' hors de data/client.ts`);
  if (/from ['"]sanity\/router['"]/.test(code) && rel !== 'app/routeur.ts')
    erreurs.push(`${rel} : import de 'sanity/router' hors de app/routeur.ts`);
  if (/from ['"]@sanity\/ui['"]/.test(code)) erreurs.push(`${rel} : import de '@sanity/ui'`);
  if (/window\.(confirm|prompt|alert)\s*\(/.test(code)) erreurs.push(`${rel} : window.confirm/prompt/alert`);
  if (/style=\{\{/.test(code)) erreurs.push(`${rel} : style en ligne (à justifier)`);
  if (/[✦✉☎⧉⏳✎✕]/u.test(code)) erreurs.push(`${rel} : emoji d'interface interdit`);
  if (/\betape\s*:\s*(4|ETAPE\.livre)\b/.test(code) && rel !== 'actions/regles.ts')
    erreurs.push(`${rel} : écrit l'étape Livré hors de planLivre (actions/regles.ts)`);
}

console.log('Fichiers par lot :');
for (const [lot, n] of [...parLot].sort()) console.log(`  ${lot} : ${n}`);

if (erreurs.length) {
  console.error(`\n${erreurs.length} problème(s) :`);
  for (const e of erreurs) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('\nPartition des lots et règles statiques : OK');
