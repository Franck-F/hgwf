/**
 * Client Supabase pour le proxy (ex-middleware). Il doit construire lui-même la
 * réponse, pour y recopier les cookies de session rafraîchis.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export function pourProxy(requete: NextRequest) {
  let reponse = NextResponse.next({ request: requete });

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => requete.cookies.getAll(),
        setAll: (aPoser) => {
          aPoser.forEach(({ name, value }) => requete.cookies.set(name, value));
          reponse = NextResponse.next({ request: requete });
          aPoser.forEach(({ name, value, options }) => reponse.cookies.set(name, value, options));
        },
      },
    },
  );

  return { client, reponse: () => reponse };
}
