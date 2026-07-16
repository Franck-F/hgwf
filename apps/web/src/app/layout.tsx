import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // gère l'encoche / safe-areas sur mobile
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
