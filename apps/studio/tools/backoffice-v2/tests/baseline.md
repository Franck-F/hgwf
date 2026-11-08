# Baseline mesurée (lot 1, 06/11/2026)

État de départ à comparer aux critères 1, 2 et 5 de la spécification (13.1). Mesuré avant d'écrire la moindre ligne de V2, puis après le lot socle.

Poste : Windows 11, Node 24.20.0, pnpm 10.24.0, TypeScript 5.9.3, vitest 2.1.9.

## 1. Vérification de types du Studio

Commande, depuis `apps/studio` : `pnpm exec tsc --noEmit`

| Moment | Erreurs | Détail |
|---|---|---|
| Avant tout code V2 (dossier `backoffice-v2/` inexistant) | **0** | sortie vide, code retour 0 |
| Après le lot 1 (squelettes typés de tous les fichiers de V2) | **0** | sortie vide, code retour 0 ; `pnpm --filter studio typecheck` identique |

La baseline du Studio est donc **zéro erreur** : le critère 1 se mesure strictement (`pnpm exec tsc --noEmit` vide, y compris hors `backoffice-v2/`). Aucune erreur préexistante à tolérer.

## 2. Tests unitaires du Studio

Commande, depuis `apps/studio` : `pnpm exec vitest run` (ou `pnpm --filter studio test`)

| Moment | Résultat |
|---|---|
| Avant le lot 1 | aucun test dans le Studio (`"test": "echo 'no studio tests'"`), vitest non installé |
| Après le lot 1 | **1 fichier, 6 tests, tous verts** : `tests/domaine/statuts.test.ts` (non-régression des index de statuts) |

Les lots suivants ajoutent leurs tests dans `tests/<couche>/` ; le total attendu augmente, la baseline reste « tout vert ».

## 3. API (inchangée)

Commande : `pnpm --filter api test` : **35 tests, 35 verts**, 0 échec. Le test du jumeau `apps/api/test/montant.test.js` pointe toujours vers V1 jusqu'au lot 15.

## 4. Environnement d'essai ajouté par le lot 1

- `apps/studio/package.json` : script `test` = `vitest run` ; devDependencies ajoutées : `vitest` ^2.1.8 (même version que `apps/web`), `jsdom` ^25.0.1, `@testing-library/react` ^16.1.0, `@testing-library/dom` ^10.4.0, `@types/react-dom` ^19 (les tests du kit et de la coque ont besoin d'un DOM ; aucun autre lot n'ajoute de dépendance).
- `pnpm-lock.yaml` : régénéré (`pnpm install --lockfile-only`), puis `pnpm install --frozen-lockfile` vérifié sans erreur.
- `apps/studio/vitest.config.ts` : inclut uniquement `tools/backoffice-v2/tests/**/*.test.{ts,tsx}` ; environnement `node` (un test d'interface met `// @vitest-environment jsdom` en tête de fichier) ; le module `sanity` est remplacé par `tests/stubs/sanity.ts` (le vrai paquet coûte ~35 s de chargement par fichier de test, 2 s avec le faux module).
