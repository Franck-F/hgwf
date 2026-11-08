/**
 * Faux module `sanity` pour vitest.
 *
 * Importer le vrai paquet coûte une trentaine de secondes par fichier de test,
 * alors que les schémas n'utilisent que les trois fabriques d'identité
 * ci-dessous et que `data/client.ts` n'a besoin que de deux hooks. Les tests
 * d'actions injectent un faux client : ces hooks ne sont jamais appelés pour de vrai.
 */
export const defineType = <T>(definition: T): T => definition;
export const defineField = <T>(definition: T): T => definition;
export const defineArrayMember = <T>(definition: T): T => definition;

export function useClient(): never {
  throw new Error('useClient : injecter un faux client dans les tests.');
}

export function useCurrentUser(): { id: string; name: string } {
  return { id: 'test', name: 'Utilisateur de test' };
}
