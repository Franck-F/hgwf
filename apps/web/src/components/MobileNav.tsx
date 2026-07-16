'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';

type Lien = { libelle: string; href: string };

export function MobileNav({
  liens,
  cta,
  logoUrl,
  nom,
}: {
  liens: Lien[];
  cta: Lien;
  logoUrl: string;
  nom: string;
}) {
  const [open, setOpen] = useState(false);
  const [monte, setMonte] = useState(false);

  // Le portail nécessite document.body (client uniquement).
  useEffect(() => setMonte(true), []);

  // Verrouille le défilement du corps quand le menu est ouvert.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Fermeture à la touche Échap.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        className="presse -mr-1.5 inline-flex h-11 w-11 items-center justify-center rounded-full text-creme md:hidden"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {/* Portail vers document.body : échappe au bloc conteneur du header
          (backdrop-filter) pour couvrir tout l'écran. */}
      {open &&
        monte &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex flex-col bg-marine md:hidden"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
          <div className="flex items-center justify-between px-5 py-3">
            <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3">
              <Image
                src={logoUrl}
                alt={nom}
                width={40}
                height={40}
                unoptimized
                className="rounded-full shadow-[0_0_0_2px_rgba(251,244,230,0.35)]"
              />
              <span className="flex flex-col">
                <span className="text-lg leading-none font-bold text-creme">HGWF</span>
                <span className="text-[8px] font-medium tracking-[0.42em] text-or uppercase">Cargo</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le menu"
              className="presse -mr-1.5 inline-flex h-11 w-11 items-center justify-center rounded-full text-creme"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <nav className="hero-entree flex flex-1 flex-col px-5 pt-3" aria-label="Navigation mobile">
            {liens.map((l) => (
              <Link
                key={l.href + l.libelle}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-creme/12 py-4 text-xl font-medium text-creme transition active:text-or"
              >
                {l.libelle}
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-or" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            ))}
            <Link
              href={cta.href}
              onClick={() => setOpen(false)}
              className="presse mt-8 inline-flex items-center justify-center rounded-full bg-corail px-6 py-4 text-base font-medium text-creme hover:bg-corail-fonce"
            >
              {cta.libelle}
            </Link>
          </nav>
        </div>,
          document.body,
        )}
    </>
  );
}
