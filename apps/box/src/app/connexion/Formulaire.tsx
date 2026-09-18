'use client';

/**
 * Connexion en deux volets : le récit à gauche, le formulaire à droite.
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
    <div className="connexion">
      <section className="connexion-recit">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span className="marque-pastille" aria-hidden="true">
            HG
          </span>
        </div>

        <div>
          <h1 className="connexion-phrase">Chaque box, à sa place.</h1>
          <p className="connexion-appui">
            Le parc, les contrats et les échéances au même endroit. Ce qui est libre se voit d’un
            coup d’œil, sans ouvrir un tableur.
          </p>
        </div>

        <p
          style={{
            position: 'relative',
            zIndex: 1,
            margin: 0,
            fontSize: 11.5,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            opacity: 0.6,
          }}
        >
          HGWF Cargo
        </p>
      </section>

      <section className="connexion-formulaire">
        <div className="connexion-boite">
          <h2 style={{ fontSize: 24, margin: '0 0 6px', letterSpacing: '-0.3px' }}>Connexion</h2>
          <p className="sous-titre" style={{ marginBottom: 26 }}>
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

            <label className="etiquette" htmlFor="mdp" style={{ marginTop: 16 }}>
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
                style={{ paddingRight: 62 }}
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="bouton-lien"
                style={{ position: 'absolute', right: 12, top: 11, fontSize: 12 }}
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
              className="bouton"
              disabled={occupe}
              style={{ width: '100%', marginTop: 22, padding: '13px 20px' }}
            >
              {occupe ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <div style={{ marginTop: 20, borderTop: '1px solid var(--trait)', paddingTop: 16 }}>
            {secoursOuvert ? (
              <>
                <p className="aide" style={{ marginTop: 0, marginBottom: 10 }}>
                  Saisissez votre adresse ci-dessus, puis demandez un lien. Il ouvre la session sans
                  mot de passe.
                </p>
                <button
                  type="button"
                  className="bouton-fantome"
                  onClick={envoyerLien}
                  disabled={occupe || !email.trim()}
                  style={{ opacity: occupe || !email.trim() ? 0.45 : 1 }}
                >
                  Recevoir un lien par e-mail
                </button>
              </>
            ) : (
              <button
                type="button"
                className="bouton-lien"
                onClick={() => setSecoursOuvert(true)}
              >
                Mot de passe oublié, ou pas encore défini ?
              </button>
            )}
          </div>

          <p className="aide" style={{ marginTop: 22 }}>
            Les accès sont ouverts par l’administrateur. Ils ne se créent pas depuis cet écran.
          </p>
        </div>
      </section>
    </div>
  );
}
