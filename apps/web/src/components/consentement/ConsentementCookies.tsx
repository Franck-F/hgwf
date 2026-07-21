'use client';

import { useEffect, useState } from 'react';
import { CLE_STOCKAGE, doitAfficher, type Choix } from './decision';

// Dispositif dormant : sans NEXT_PUBLIC_CONSENTEMENT_COOKIES=1, ce composant ne
// rend rien. Le site ne dépose aujourd'hui aucun cookie — demander un
// consentement sans objet nuirait à l'expérience sans rien apporter.
const ACTIF = process.env.NEXT_PUBLIC_CONSENTEMENT_COOKIES === '1';

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
      role="dialog"
      aria-label={en ? 'Cookie consent' : 'Consentement aux cookies'}
      className="fixed inset-x-3 bottom-3 z-70 mx-auto max-w-[560px] rounded-[18px] border border-marine/20 bg-creme p-5 shadow-lg"
    >
      <p className="m-0 text-sm leading-[1.55] text-encre-douce">
        {en
          ? 'We use measurement cookies to understand how the site is used. You can refuse them without affecting your browsing.'
          : 'Nous utilisons des cookies de mesure d’audience pour comprendre l’usage du site. Vous pouvez les refuser sans que cela change votre navigation.'}{' '}
        <a href={`/${locale}/confidentialite/#cookies`} className="font-medium text-corail underline">
          {en ? 'Learn more' : 'En savoir plus'}
        </a>
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => enregistrer('refuse')}
          className="presse w-full rounded-full border-[1.5px] border-marine px-6 py-2.5 text-sm font-medium text-marine hover:bg-marine hover:text-creme sm:w-auto"
        >
          {en ? 'Refuse all' : 'Tout refuser'}
        </button>
        <button
          type="button"
          onClick={() => enregistrer('accepte')}
          className="presse w-full rounded-full border-[1.5px] border-marine bg-marine px-6 py-2.5 text-sm font-medium text-creme hover:bg-marine-fonce sm:w-auto"
        >
          {en ? 'Accept all' : 'Tout accepter'}
        </button>
      </div>
    </div>
  );
}
