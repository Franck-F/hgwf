import { createClient } from 'next-sanity';

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? '';
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2024-10-01';

// Mode préversion (déploiement SSR Vercel dédié à l'aperçu du Studio) :
//  - lit les BROUILLONS non publiés via un jeton lecteur (serveur uniquement) ;
//  - active le stega (lien invisible texte↔champ) pour le cliquer-pour-éditer.
// En production statique, rien de tout cela : contenu publié, HTML propre.
export const isPreview = process.env.NEXT_PUBLIC_SITE_MODE === 'preview';
const viewerToken = process.env.SANITY_VIEWER_TOKEN;
const studioUrl = process.env.NEXT_PUBLIC_SANITY_STUDIO_URL ?? 'https://hgwf-cargo.sanity.studio';
// Lire les brouillons exige un jeton ; sans jeton, la préversion reste sur le
// contenu publié (le cliquer-pour-éditer via stega fonctionne quand même).
const useDrafts = isPreview && !!viewerToken;

export const sanityClient = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: false, // toujours le contenu le plus frais (build ou brouillon)
      // 'previewDrafts' : compatible @sanity/client v6 (next-sanity 13) ET v7.
      perspective: useDrafts ? ('previewDrafts' as const) : ('published' as const),
      ...(useDrafts ? { token: viewerToken } : {}),
      ...(isPreview ? { stega: { enabled: true, studioUrl } } : {}),
    })
  : null;
