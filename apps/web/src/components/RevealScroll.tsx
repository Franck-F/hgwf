'use client';

import { useEffect } from 'react';
import { usePathname } from '@/i18n/navigation';

/**
 * Révélations au scroll — pilotées par IntersectionObserver.
 *
 * Amélioration progressive : la classe `reveal-js` n'est posée sur <html> que
 * si JavaScript s'exécute ET que le mouvement n'est pas réduit. C'est cette
 * classe qui active l'état initial masqué défini dans globals.css. Sans JS,
 * sans IntersectionObserver, ou en `prefers-reduced-motion`, tout le contenu
 * reste visible — jamais de section qui s'affiche vide.
 *
 * Contrairement à `animation-timeline: view()` (Chromium uniquement), cette
 * approche révèle les éléments sur Safari, Firefox et Chrome de la même façon.
 */
export function RevealScroll() {
  // Re-scanner à chaque changement d'URL : la navigation client (next/link)
  // monte un nouveau contenu que l'observateur initial n'a pas vu.
  const pathname = usePathname();

  useEffect(() => {
    const racine = document.documentElement;

    const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (mouvementReduit || typeof IntersectionObserver === 'undefined') return;

    racine.classList.add('reveal-js');

    const cibles = Array.from(
      document.querySelectorAll<HTMLElement>('.revele, .revele-cascade, .revele-image'),
    ).filter((el) => !el.classList.contains('revele-visible'));

    const observateur = new IntersectionObserver(
      (entrees, obs) => {
        for (const entree of entrees) {
          if (!entree.isIntersecting) continue;
          entree.target.classList.add('revele-visible');
          obs.unobserve(entree.target);
        }
      },
      // La marge basse déclenche la révélation un peu avant que l'élément
      // n'atteigne le bas de l'écran, pour un rendu naturel au scroll.
      { threshold: 0, rootMargin: '0px 0px -12% 0px' },
    );

    // Ligne de flottaison : tout ce qui est déjà à l'écran (ou déjà défilé
    // au-dessus, cas d'un scroll rapide avant hydratation) est révélé
    // immédiatement, dans le même tick — donc sans clignotement au chargement.
    const ligne = window.innerHeight * 0.88;
    for (const el of cibles) {
      if (el.getBoundingClientRect().top < ligne) {
        el.classList.add('revele-visible');
      } else {
        observateur.observe(el);
      }
    }

    return () => observateur.disconnect();
  }, [pathname]);

  return null;
}
