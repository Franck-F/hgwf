'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { enableVisualEditing } from '@sanity/visual-editing';

type NavUpdate = { type: 'push' | 'replace' | 'pop'; url: string };

/**
 * Édition visuelle pour l'outil « Aperçu du site » du Studio.
 *
 * Version sans Server Actions (incompatibles avec l'export statique) : API
 * vanilla + rafraîchissement via le routeur Next. Le « history adapter » relie
 * la navigation de l'app à l'outil Aperçu — sans lui, on reste bloqué sur la
 * première page (l'outil ne sait ni changer de page, ni suivre les liens).
 */
export function VisualEditingDev() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navigate = useRef<((u: NavUpdate) => void) | null>(null);

  useEffect(() => {
    return enableVisualEditing({
      history: {
        // L'app signale sa navigation à l'Aperçu (barre d'URL + résolution du doc).
        subscribe: (cb: (u: NavUpdate) => void) => {
          navigate.current = cb;
          return () => {
            navigate.current = null;
          };
        },
        // L'Aperçu demande à naviguer (barre d'URL, liens) → on pilote le routeur.
        update: (u: NavUpdate) => {
          if (u.type === 'push') router.push(u.url);
          else if (u.type === 'replace') router.replace(u.url);
          else if (u.type === 'pop') router.back();
        },
      },
      refresh: () => {
        router.refresh();
        return Promise.resolve();
      },
    });
  }, [router]);

  // À chaque changement d'URL de l'app, on le rapporte à l'outil Aperçu.
  useEffect(() => {
    const qs = searchParams?.toString();
    navigate.current?.({ type: 'push', url: qs ? `${pathname}?${qs}` : pathname });
  }, [pathname, searchParams]);

  return null;
}
