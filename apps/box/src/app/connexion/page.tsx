'use client';

/**
 * Connexion par lien envoyé en e-mail. Pas de mot de passe : rien à retenir,
 * rien à fuiter, rien à réinitialiser.
 *
 * L'accès n'est pas ouvert : créer un compte se fait depuis le tableau de bord
 * Supabase. Une adresse inconnue reçoit... rien, et l'écran dit la même chose
 * que pour une adresse connue — sinon ce formulaire devient un moyen de savoir
 * qui travaille ici.
 */
import { useState } from 'react';
import { navigateur } from '@/lib/supabase-navigateur';
import { CIEL, CREME, IVOIRE, MARINE, MONO, ROUGE } from '@/lib/charte';

export default function Connexion() {
  const [email, setEmail] = useState('');
  const [etat, setEtat] = useState<'saisie' | 'envoi' | 'envoye'>('saisie');
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEtat('envoi');

    const { error } = await navigateur().auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirmation`,
        shouldCreateUser: false,
      },
    });

    // Une erreur de quota ou de réseau se dit. Une adresse inconnue, non :
    // l'écran de succès est le même dans les deux cas.
    if (error && !/user not found|signups not allowed/i.test(error.message)) {
      setErreur(error.message);
      setEtat('saisie');
      return;
    }
    setEtat('envoye');
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: IVOIRE,
          border: `1.5px solid ${MARINE}`,
          borderRadius: 14,
          padding: 32,
        }}
      >
        <p style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 1, margin: 0, opacity: 0.7 }}>
          HGWF CARGO
        </p>
        <h1 style={{ fontSize: 26, margin: '6px 0 4px' }}>Box de stockage</h1>

        {etat === 'envoye' ? (
          <div style={{ marginTop: 20, lineHeight: 1.55 }}>
            <p style={{ margin: 0 }}>
              Si <strong>{email.trim()}</strong> a un accès, un lien de connexion vient d’y être
              envoyé. Il est valable une heure.
            </p>
            <button
              onClick={() => {
                setEtat('saisie');
                setErreur(null);
              }}
              style={{
                marginTop: 18,
                background: 'transparent',
                border: `1.5px solid ${MARINE}`,
                borderRadius: 8,
                padding: '10px 16px',
              }}
            >
              Essayer une autre adresse
            </button>
          </div>
        ) : (
          <form onSubmit={envoyer} style={{ marginTop: 20 }}>
            <label htmlFor="email" style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>
              Adresse e-mail professionnelle
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 12px',
                borderRadius: 8,
                border: `1.5px solid ${MARINE}`,
                background: CREME,
              }}
            />

            {erreur && (
              <p style={{ color: ROUGE, fontSize: 13, marginTop: 10, marginBottom: 0 }}>{erreur}</p>
            )}

            <button
              type="submit"
              disabled={etat === 'envoi'}
              style={{
                marginTop: 18,
                width: '100%',
                background: MARINE,
                color: CREME,
                border: 'none',
                borderRadius: 8,
                padding: '12px 16px',
                fontWeight: 700,
                opacity: etat === 'envoi' ? 0.5 : 1,
              }}
            >
              {etat === 'envoi' ? 'Envoi…' : 'Recevoir un lien de connexion'}
            </button>
          </form>
        )}

        <p style={{ fontSize: 12.5, opacity: 0.65, marginTop: 22, marginBottom: 0, lineHeight: 1.5 }}>
          L’accès est ouvert par l’administrateur, il ne se crée pas depuis cet écran. Lien de
          connexion en dernier recours :{' '}
          <span style={{ fontFamily: MONO, color: CIEL }}>contact@hgwf-cargo.fr</span>
        </p>
      </div>
    </main>
  );
}
