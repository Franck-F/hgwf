import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Tests du back-office V2 uniquement (le reste du Studio n'a pas de tests).
 * Environnement `node` par défaut ; un test d'interface demande jsdom par un
 * commentaire en tête de fichier : `// @vitest-environment jsdom`.
 *
 * `sanity` est remplacé par un faux module : le vrai paquet fait perdre ~35 s
 * par fichier de test (les schémas importés par `domaine/statuts.ts` le tirent).
 */
export default defineConfig({
  resolve: {
    alias: {
      sanity: fileURLToPath(new URL('./tools/backoffice-v2/tests/stubs/sanity.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tools/backoffice-v2/tests/**/*.test.{ts,tsx}'],
  },
});
