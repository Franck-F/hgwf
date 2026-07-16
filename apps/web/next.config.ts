import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Double mode :
//  - production (défaut) → export statique (Netlify / OVH), rapide et figé.
//  - préversion (NEXT_PUBLIC_SITE_MODE=preview, sur Vercel) → SSR, pour l'aperçu
//    visuel du Studio avec édition des brouillons en direct.
const isPreview = process.env.NEXT_PUBLIC_SITE_MODE === 'preview';

const nextConfig: NextConfig = {
  ...(isPreview ? {} : { output: 'export' }),
  trailingSlash: true,
  images: {
    loader: 'custom',
    loaderFile: './src/sanity/image-loader.ts',
  },
};

export default withNextIntl(nextConfig);
