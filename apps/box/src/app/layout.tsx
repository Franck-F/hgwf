import type { Metadata, Viewport } from 'next';
// Les icônes Phosphor viennent du paquet npm, pas d'un CDN : un outil
// d'exploitation ne doit pas dépendre d'unpkg pour afficher sa navigation.
import '@phosphor-icons/web/duotone';
import '@phosphor-icons/web/regular';
import './global.css';

export const metadata: Metadata = {
  title: 'Box de stockage — HGWF',
  description: 'Gestion des box de stockage HGWF Cargo.',
  // Outil interne : jamais dans un moteur de recherche.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#063565',
};

export default function RacineLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
