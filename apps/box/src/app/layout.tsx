import type { Metadata } from 'next';
import { CREME, MARINE, SANS } from '@/lib/charte';
import './global.css';

export const metadata: Metadata = {
  title: 'Box de stockage — HGWF',
  description: 'Gestion des box de stockage HGWF Cargo.',
  // Outil interne : jamais dans un moteur de recherche.
  robots: { index: false, follow: false },
};

export default function RacineLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, background: CREME, color: MARINE, fontFamily: SANS }}>
        {children}
      </body>
    </html>
  );
}
