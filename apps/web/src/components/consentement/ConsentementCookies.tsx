'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { CLE_STOCKAGE, doitAfficher, type Choix } from './decision';

// Dispositif dormant : sans NEXT_PUBLIC_CONSENTEMENT_COOKIES=1, ce composant ne
// rend rien. Le site ne dépose aujourd'hui aucun cookie — demander un
// consentement sans objet nuirait à l'expérience sans rien apporter.
const ACTIF = process.env.NEXT_PUBLIC_CONSENTEMENT_COOKIES === '1';

// Les deux choix doivent avoir le même poids visuel (recommandation CNIL) :
// un même style, en contour, appliqué aux deux boutons.
const BOUTON =
  'presse w-full rounded-full border-[1.5px] border-marine px-6 py-2.5 text-sm font-medium text-marine hover:bg-marine hover:text-creme sm:w-auto';

export function ConsentementCookies({ locale }: { locale: string }) {
  const [visible, setVisible] = useState(false);
  const en = locale === 'en';

  useEffect(() => {
    if (!ACTIF) return;
    let choix: string | null = null;
    try {
      choix = window.localStorage.getItem(CLE_STOCKAGE);
    } catch {
      // Navigation privée ou stockage bloqué : on affiche le bandeau.
    }
    setVisible(doitAfficher(ACTIF, choix));
  }, []);

  // Fermeture au clavier (Échap), cohérente avec MobileNav. Ne déclenche
  // aucune écriture dans le stockage : fermer sans choisir masque le
  // bandeau pour la session en cours seulement, et l'absence de choix
  // (valant refus) le fera réapparaître à la prochaine visite.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setVisible(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

  if (!ACTIF || !visible) return null;

  const enregistrer = (choix: Choix) => {
    try {
      window.localStorage.setItem(CLE_STOCKAGE, choix);
    } catch {
      // Sans stockage, le choix vaut pour la session en cours.
    }
    setVisible(false);
  };

  return (
    <div
      // Bandeau non modal : à la différence de MobileNav (qui verrouille le
      // focus et le défilement derrière un panneau plein écran), il n'intercepte
      // rien et laisse le reste de la page utilisable. On garde role="dialog"
      // pour une boîte de dialogue autonome, mais on n'ajoute pas
      // aria-modal="true" : ce serait annoncer aux technologies d'assistance un
      // blocage qui n'existe pas.
      role="dialog"
      aria-label={en ? 'Cookie consent' : 'Consentement aux cookies'}
      className="fixed inset-x-3 bottom-3 z-70 mx-auto max-w-[560px] rounded-[18px] border border-marine/20 bg-creme p-5 shadow-lg"
    >
      <p className="m-0 text-sm leading-[1.55] text-encre-douce">
        {en
          ? 'We use measurement cookies to understand how the site is used. You can refuse them without affecting your browsing.'
          : 'Nous utilisons des cookies de mesure d’audience pour comprendre l’usage du site. Vous pouvez les refuser sans que cela change votre navigation.'}{' '}
        <Link href="/confidentialite/#cookies" className="font-medium text-corail underline">
          {en ? 'Learn more' : 'En savoir plus'}
        </Link>
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => enregistrer('refuse')} className={BOUTON}>
          {en ? 'Refuse all' : 'Tout refuser'}
        </button>
        <button type="button" onClick={() => enregistrer('accepte')} className={BOUTON}>
          {en ? 'Accept all' : 'Tout accepter'}
        </button>
      </div>
    </div>
  );
}
