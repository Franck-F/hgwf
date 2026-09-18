/**
 * Proxy de requête (anciennement « middleware »).
 *
 * Deux rôles, et un seul endroit pour les tenir :
 *   1. rafraîchir la session à chaque requête, sinon elle expire en silence ;
 *   2. refuser l'accès à toute page sauf la connexion tant qu'on n'est pas
 *      authentifié.
 *
 * La redirection ici n'est pas la sécurité : la sécurité est dans les
 * politiques RLS de la base. Elle évite seulement d'afficher des écrans vides.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { pourProxy } from '@/lib/supabase-proxy';

const PUBLIQUES = ['/connexion', '/auth'];

export async function proxy(requete: NextRequest) {
  const { client, reponse } = pourProxy(requete);

  // getUser() et pas getSession() : seul getUser() revalide le jeton auprès du
  // serveur. getSession() se contente de relire un cookie, qu'on peut forger.
  const {
    data: { user },
  } = await client.auth.getUser();

  const chemin = requete.nextUrl.pathname;
  const estPublique = PUBLIQUES.some((p) => chemin.startsWith(p));

  if (!user && !estPublique) {
    const vers = requete.nextUrl.clone();
    vers.pathname = '/connexion';
    vers.searchParams.set('suite', chemin);
    return NextResponse.redirect(vers);
  }

  if (user && chemin === '/connexion') {
    const vers = requete.nextUrl.clone();
    vers.pathname = '/';
    vers.search = '';
    return NextResponse.redirect(vers);
  }

  return reponse();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
