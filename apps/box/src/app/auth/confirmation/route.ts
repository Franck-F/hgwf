/**
 * Point d'arrivée du lien reçu par e-mail. Supabase y renvoie un jeton à usage
 * unique, qu'on échange ici contre une session posée en cookie.
 *
 * Le paramètre « suite » est volontairement restreint aux chemins internes :
 * accepter une URL complète ferait de cet écran une redirection ouverte,
 * exploitable pour envoyer quelqu'un ailleurs depuis un lien qui semble venir
 * de chez nous.
 */
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { serveur } from '@/lib/supabase-serveur';

export async function GET(requete: NextRequest) {
  const parametres = requete.nextUrl.searchParams;
  const jeton = parametres.get('token_hash');
  const type = parametres.get('type') as EmailOtpType | null;

  const brut = parametres.get('suite') ?? '/';
  const suite = brut.startsWith('/') && !brut.startsWith('//') ? brut : '/';

  if (!jeton || !type) {
    return NextResponse.redirect(new URL('/connexion?erreur=lien-incomplet', requete.url));
  }

  const client = await serveur();
  const { error } = await client.auth.verifyOtp({ type, token_hash: jeton });

  if (error) {
    return NextResponse.redirect(new URL('/connexion?erreur=lien-expire', requete.url));
  }

  return NextResponse.redirect(new URL(suite, requete.url));
}
