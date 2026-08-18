'use client';

import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';

export type ContactFormContent = {
  titre: string;
  placeholderNom: string;
  placeholderTel: string;
  placeholderEmail: string;
  placeholderMessage: string;
  // Libellé du sélecteur de sujet — sans lui, le <select> n'a aucun nom accessible.
  libelleSujet: string;
  sujets: string[];
  boutonEnvoyer: string;
  confirmationTitre: string;
  confirmationTexte: string;
  boutonReinitialiser: string;
  emailDestinataire: string;
  // Mention RGPD affichée sous le bouton d'envoi ; scindée en deux pour
  // pouvoir insérer le lien vers la politique de confidentialité au milieu.
  mentionRgpd: { texte: string; lienLibelle: string };
  // Message affiché quand on tente d'envoyer sans nom ni moyen de contact.
  erreurContact: string;
};

const CHAMP_CLASSES =
  'w-full rounded-[14px] border-[1.5px] border-marine/20 bg-ivoire px-3.5 py-3 font-sans text-[15px] text-marine outline-none focus:border-corail';

const API_URL = process.env.NEXT_PUBLIC_HGWF_API_URL;

export function ContactForm({ content }: { content: ContactFormContent }) {
  const [nom, setNom] = useState('');
  const [tel, setTel] = useState('');
  const [email, setEmail] = useState('');
  const [sujet, setSujet] = useState(content.sujets[0] ?? '');
  const [message, setMessage] = useState('');
  const [envoye, setEnvoye] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState(false);

  // À la confirmation, le focus rejoint le titre : un utilisateur clavier ou
  // lecteur d'écran sait immédiatement que son message est parti.
  const titreConfirmation = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (envoye) titreConfirmation.current?.focus();
  }, [envoye]);

  const envoyerParMail = () => {
    const corps = [message, '', nom, tel ? `Tél : ${tel}` : '', email ? `E-mail : ${email}` : '']
      .filter(Boolean)
      .join('\n');
    const url = `mailto:${content.emailDestinataire}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
    window.location.href = url;
  };

  const envoyer = async () => {
    // Même règle que l'API : un nom et au moins un moyen de contact. Sans ce
    // garde-fou, un message vide « partait » et affichait une fausse
    // confirmation (l'API le refusait, le code retombait sur mailto).
    if (!nom.trim() || (!email.trim() && !tel.trim())) {
      setErreur(true);
      return;
    }
    setErreur(false);

    // Envoi direct au back-office quand l'API est configurée ; repli mailto sinon.
    if (API_URL) {
      setEnvoiEnCours(true);
      try {
        const rep = await fetch(`${API_URL}/api/demande-devis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nom, email, tel, message, typeEnvoi: sujet, website: '' }),
        });
        if (rep.ok) {
          setEnvoye(true);
          return;
        }
      } catch {
        // API injoignable : on retombe sur le mail
      } finally {
        setEnvoiEnCours(false);
      }
    }
    envoyerParMail();
    setEnvoye(true);
  };

  const reinitialiser = () => {
    setEnvoye(false);
    setMessage('');
    setSujet(content.sujets[0] ?? '');
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-marine/14">
      <div className="flex min-w-0 flex-col gap-4 px-5 py-8 sm:px-8 sm:py-10 md:px-11">
        {!envoye ? (
          <div className="flex flex-col gap-4">
            <h2 className="m-0 text-[26px] font-bold tracking-[-0.03em] uppercase">{content.titre}</h2>
            {/* Vrais labels : un placeholder disparaît dès la saisie, un label reste. */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                {content.placeholderNom}
                <input
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  aria-invalid={erreur && !nom.trim() ? true : undefined}
                  aria-describedby={erreur ? 'erreur-contact' : undefined}
                  className={CHAMP_CLASSES}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                {content.placeholderTel}
                <input
                  type="tel"
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                  aria-invalid={erreur && !email.trim() && !tel.trim() ? true : undefined}
                  aria-describedby={erreur ? 'erreur-contact' : undefined}
                  className={CHAMP_CLASSES}
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                {content.placeholderEmail}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={erreur && !email.trim() && !tel.trim() ? true : undefined}
                  aria-describedby={erreur ? 'erreur-contact' : undefined}
                  className={CHAMP_CLASSES}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                {content.libelleSujet}
                <select value={sujet} onChange={(e) => setSujet(e.target.value)} className={CHAMP_CLASSES}>
                  {content.sujets.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium">
              {content.placeholderMessage}
              <textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`${CHAMP_CLASSES} resize-y`}
              />
            </label>
            {erreur && (
              <p id="erreur-contact" role="alert" className="m-0 text-[13px] font-medium text-corail-texte">
                {content.erreurContact}
              </p>
            )}
            <button
              onClick={envoyer}
              disabled={envoiEnCours}
              aria-busy={envoiEnCours || undefined}
              className="presse self-start rounded-full border-none bg-corail px-7 py-3.5 font-sans text-[15px] font-medium text-marine hover:bg-or disabled:opacity-60"
            >
              {envoiEnCours ? '…' : content.boutonEnvoyer}
            </button>
            <p className="m-0 text-xs leading-[1.5] text-encre-douce">
              {content.mentionRgpd.texte}{' '}
              <Link href="/confidentialite" className="underline">
                {content.mentionRgpd.lienLibelle}
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3.5 py-3">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-or/18">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fdb53d" strokeWidth="2.5" aria-hidden="true">
                <path d="M4 12l5 5L20 6" />
              </svg>
            </span>
            <h2 ref={titreConfirmation} tabIndex={-1} className="m-0 text-[26px] font-bold tracking-[-0.03em] uppercase outline-none">
              {content.confirmationTitre}
            </h2>
            <p className="m-0 max-w-[48ch] text-[15px] leading-[1.55] text-encre-douce">
              {nom ? content.confirmationTexte.replace('{nom}', nom) : content.confirmationTexte.replace(' {nom}', '')}
            </p>
            <button
              onClick={reinitialiser}
              className="rounded-full border-[1.5px] border-marine bg-transparent px-6 py-2.5 font-sans text-sm font-medium text-marine transition hover:bg-creme"
            >
              {content.boutonReinitialiser}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
