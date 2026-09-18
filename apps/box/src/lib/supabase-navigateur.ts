/**
 * Client Supabase pour le navigateur.
 *
 * Fichier séparé de `supabase-serveur.ts` : celui-ci importe `next/headers`,
 * indisponible côté navigateur. Un seul module pour les deux fait échouer la
 * compilation dès qu'un composant client l'importe.
 *
 * La clé publiable est faite pour être exposée : ce sont les politiques RLS de
 * la base qui protègent les données, pas le secret de la clé.
 */
import { createBrowserClient } from '@supabase/ssr';

export function navigateur() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
