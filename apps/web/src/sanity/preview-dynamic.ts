import { isPreview } from './client';

/**
 * En préversion (déploiement SSR), force le rendu dynamique (par requête) afin
 * que les modifications de brouillons apparaissent en direct dans l'aperçu du
 * Studio. En production statique, `isPreview` est faux → aucun appel dynamique
 * n'est exécuté, donc l'export statique reste possible (fonction sans effet).
 *
 * Appelée dans le layout [locale] : rend dynamiques toutes les pages du site.
 */
export async function previewDynamique(): Promise<void> {
  if (!isPreview) return;
  const { connection } = await import('next/server');
  await connection();
}
