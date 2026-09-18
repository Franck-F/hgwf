/**
 * Client Supabase pour les composants et actions serveur. Lit et écrit les
 * cookies de session. Ne jamais importer depuis un composant client.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function serveur() {
  const magasin = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => magasin.getAll(),
        setAll: (aPoser) => {
          try {
            aPoser.forEach(({ name, value, options }) => magasin.set(name, value, options));
          } catch {
            // Appelé depuis un composant serveur : Next interdit d'écrire un
            // cookie à ce moment-là. Le proxy rafraîchit déjà la session, donc
            // il n'y a rien à rattraper ici.
          }
        },
      },
    },
  );
}
