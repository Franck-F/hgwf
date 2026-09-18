'use client';

/**
 * Connexion.
 *
 * Voie principale : adresse et mot de passe. C'est ce qui ouvre le plus vite,
 * et ça ne dépend pas du quota d'envoi d'e-mails.
 *
 * Voie de secours : un lien reçu par e-mail, qui sert aussi de « mot de passe
 * oublié ». Repliée par défaut pour ne pas encombrer l'écran courant.
 *
 * Dans les deux cas, l'écran ne dit jamais si une adresse existe : sinon ce
 * formulaire devient un moyen de savoir qui travaille ici. Les comptes
 * s'ouvrent depuis le tableau de bord Supabase, jamais d'ici.
 */
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { navigateur } from '@/lib/supabase-navigateur';
import { CIEL, CREME, IVOIRE, MARINE, MONO, ROUGE, VERT } from '@/lib/charte';

export default function FormulaireConnexion() {
  const router = useRouter();
  const parametres = useSearchParams();
  const suite = parametres.get('suite') ?? '/';

  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [lienEnvoye, setLienEnvoye] = useState(false);
  const [secoursOuvert, setSecoursOuvert] = useState(false);

  async function connecter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setOccupe(true);

    const { error } = await navigateur().auth.signInWithPassword({
      email: email.trim(),
      password: motDePasse,
    });

    if (error) {
      // Supabase répond « Invalid login credentials » sans distinguer une
      // adresse inconnue d'un mauvais mot de passe. On garde cette indistinction.
      setErreur(
        /invalid login credentials/i.test(error.message)
          ? 'Adresse ou mot de passe incorrect.'
          : error.message,
      );
      setOccupe(false);
      return;
    }

    // refresh() force le proxy à relire la session fraîchement posée en cookie,
    // sans quoi la page d'arrivée redirigerait aussitôt vers la connexion.
    router.replace(suite.startsWith('/') && !suite.startsWith('//') ? suite : '/');
    router.refresh();
  }

  async function envoyerLien() {
    setErreur(null);
    setOccupe(true);

    const { error } = await navigateur().auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirmation?suite=${encodeURIComponent(suite)}`,
        shouldCreateUser: false,
      },
    });

    if (error && !/user not found|signups not allowed/i.test(error.message)) {
      setErreur(error.message);
      setOccupe(false);
      return;
    }
    setOccupe(false);
    setLienEnvoye(true);
  }

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
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
        <h1 style={{ fontSize: 26, margin: '6px 0 22px' }}>Box de stockage</h1>

        <form onSubmit={connecter}>
          <label htmlFor="email" style={etiquette}>
            Adresse e-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoFocus
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={champ}
          />

          <label htmlFor="mdp" style={{ ...etiquette, marginTop: 14 }}>
            Mot de passe
          </label>
          <input
            id="mdp"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            style={champ}
          />

          {erreur && <p style={{ color: ROUGE, fontSize: 13, margin: '12px 0 0' }}>{erreur}</p>}
          {lienEnvoye && (
            <p style={{ color: VERT, fontSize: 13, margin: '12px 0 0', lineHeight: 1.5 }}>
              Si cette adresse a un accès, un lien de connexion vient d’y être envoyé. Il est
              valable une heure.
            </p>
          )}

          <button type="submit" disabled={occupe} style={{ ...bouton, opacity: occupe ? 0.5 : 1 }}>
            {occupe ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div style={{ marginTop: 18, borderTop: '1px solid rgba(18,57,91,0.15)', paddingTop: 14 }}>
          {secoursOuvert ? (
            <div style={{ fontSize: 13, lineHeight: 1.55 }}>
              <p style={{ margin: '0 0 10px', opacity: 0.8 }}>
                Saisissez votre adresse ci-dessus, puis demandez un lien de connexion. Il ouvre la
                session sans mot de passe.
              </p>
              <button
                type="button"
                onClick={envoyerLien}
                disabled={occupe || !email.trim()}
                style={{
                  background: 'transparent',
                  border: `1.5px solid ${MARINE}`,
                  borderRadius: 8,
                  padding: '9px 14px',
                  opacity: occupe || !email.trim() ? 0.45 : 1,
                }}
              >
                Recevoir un lien par e-mail
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSecoursOuvert(true)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: 13,
                color: CIEL,
                textDecoration: 'underline',
              }}
            >
              Mot de passe oublié, ou pas encore défini ?
            </button>
          )}
        </div>

        <p style={{ fontSize: 12, opacity: 0.6, marginTop: 20, marginBottom: 0, lineHeight: 1.5 }}>
          Les accès sont ouverts par l’administrateur. Ils ne se créent pas depuis cet écran.
        </p>
      </div>
    </main>
  );
}

const etiquette: React.CSSProperties = { display: 'block', fontSize: 13.5, marginBottom: 5 };

const champ: React.CSSProperties = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: 8,
  border: `1.5px solid ${MARINE}`,
  background: CREME,
};

const bouton: React.CSSProperties = {
  marginTop: 20,
  width: '100%',
  background: MARINE,
  color: CREME,
  border: 'none',
  borderRadius: 8,
  padding: '12px 16px',
  fontWeight: 700,
};
