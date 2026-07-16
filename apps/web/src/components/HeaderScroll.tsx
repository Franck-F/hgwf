'use client';

import { useEffect } from 'react';

/**
 * Matérialisation du header au scroll (façon Apple §12).
 *
 * Pose `data-defilee` sur <html> selon la position de scroll ; le style vit
 * dans globals.css (`:root[data-defilee='true'] .entete`). En haut de page le
 * header est transparent (fondu sur le hero marine) ; dès qu'on défile il se
 * teinte + ombre de bord. En JS (et non `animation-timeline: scroll()`) pour
 * fonctionner sur Safari/Firefox — sinon le header resterait transparent au
 * scroll et le texte crème deviendrait illisible sur le contenu clair.
 */
export function HeaderScroll() {
  useEffect(() => {
    const root = document.documentElement;
    let ticking = false;

    const applique = () => {
      root.dataset.defilee = window.scrollY > 16 ? 'true' : 'false';
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(applique);
    };

    applique(); // état initial (rechargement en cours de page)
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return null;
}
