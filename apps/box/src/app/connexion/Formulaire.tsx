'use client';

/**
 * Connexion en deux volets : le récit à gauche sur le violet, le formulaire à
 * droite sur blanc.
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

export default function FormulaireConnexion() {
  const router = useRouter();
  const parametres = useSearchParams();
  const suite = parametres.get('suite') ?? '/';

  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [visible, setVisible] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [lienEnvoye, setLienEnvoye] = useState(false);
  const [secoursOuvert, setSecoursOuvert] = useState(false);

  async function connecter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setLienEnvoye(false);
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
    <main className="connexion-scene">
      <div className="connexion-panneau">
        <section className="connexion-recit">
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 15,
              background: 'rgba(255,255,255,0.2)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 22,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <i className="ph-duotone ph-package" aria-hidden="true" />
          </span>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.26, margin: 0 }}>
              Chaque box,
              <br />à sa place.
            </h1>
            <p
              style={{
                margin: '16px 0 0',
                fontSize: 14,
                lineHeight: 1.65,
                color: '#ddd7ff',
                maxWidth: '34ch',
              }}
            >
              Le parc, les contrats et les échéances au même endroit. Ce qui est libre se voit d’un
              coup d’œil, sans ouvrir un tableur.
            </p>
          </div>

          <p
            style={{
              position: 'relative',
              zIndex: 1,
              margin: 0,
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.65)',
            }}
          >
            HGWF Cargo
          </p>
        </section>

        <section className="connexion-formulaire">
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px' }}>Connexion</h2>
          <p className="section-note" style={{ marginBottom: 26 }}>
            Accès réservé à l’équipe HGWF.
          </p>

          <form onSubmit={connecter}>
            <label className="etiquette" htmlFor="email">
              Adresse e-mail
            </label>
            <input
              id="email"
              className="champ"
              type="email"
              required
              autoFocus
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label className="etiquette" htmlFor="mdp" style={{ marginTop: 18 }}>
              Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="mdp"
                className="champ"
                type={visible ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                style={{ paddingRight: 68 }}
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="bouton-lien"
                style={{ position: 'absolute', right: 13, top: 12, fontSize: 12 }}
              >
                {visible ? 'masquer' : 'voir'}
              </button>
            </div>

            {erreur && (
              <p className="retour retour-erreur" style={{ margin: '14px 0 0' }}>
                {erreur}
              </p>
            )}
            {lienEnvoye && (
              <p className="retour retour-ok" style={{ margin: '14px 0 0', lineHeight: 1.5 }}>
                Si cette adresse a un accès, un lien de connexion vient d’y être envoyé. Il est
                valable une heure.
              </p>
            )}

            <button
              type="submit"
              className="bouton bouton-violet"
              disabled={occupe}
              style={{ width: '100%', marginTop: 24, padding: '13px 20px', fontSize: 14 }}
            >
              {occupe ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <div
            style={{
              marginTop: 20,
              borderTop: '1px dashed var(--trait-clair)',
              paddingTop: 16,
            }}
          >
            {secoursOuvert ? (
              <>
                <p className="aide" style={{ marginTop: 0, marginBottom: 12 }}>
                  Saisissez votre adresse ci-dessus, puis demandez un lien. Il ouvre la session sans
                  mot de passe.
                </p>
                <button
                  type="button"
                  className="bouton-discret"
                  onClick={envoyerLien}
                  disabled={occupe || !email.trim()}
                  style={{ opacity: occupe || !email.trim() ? 0.45 : 1 }}
                >
                  <i className="ph ph-envelope-simple" aria-hidden="true" /> Recevoir un lien
                </button>
              </>
            ) : (
              <button type="button" className="bouton-lien" onClick={() => setSecoursOuvert(true)}>
                Mot de passe oublié, ou pas encore défini ?
              </button>
            )}
          </div>

          <p className="aide" style={{ marginTop: 22 }}>
            Les accès sont ouverts par l’administrateur. Ils ne se créent pas depuis cet écran.
          </p>
        </section>
      </div>
    </main>
  );
}
