'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';

export type DevisWizardContent = {
  etapeLabels: string[];
  etapeType: { titre: string };
  etapeDestination: {
    titre: string;
    libelleDestination: string;
    libelleDepart: string;
    libelleDelai: string;
  };
  etapeVolume: { titre: string; texte: string; boutonAjouter: string };
  etapeCoordonnees: {
    titre: string;
    placeholderNom: string;
    placeholderEmail: string;
    placeholderTel: string;
    placeholderMessage: string;
  };
  recap: {
    titre: string;
    libelleType: string;
    libelleDestination: string;
    libelleDepart: string;
    libelleVolume: string;
  };
  confirmation: { titre: string; texte: string; boutonContact: string; boutonAccueil: string };
  boutons: { precedent: string; suivant: string; envoyer: string };
  typesEnvoi: { label: string; description: string }[];
  destinations: { nom: string; delai: string }[];
  portsDepart: string[];
  imagesEtapes: (string | null)[];
  emailDestinataire: string;
  sujetEmail: string;
  // Mention RGPD affichée sous le bouton d'envoi de la dernière étape ;
  // scindée en deux pour pouvoir insérer le lien vers la politique de
  // confidentialité au milieu.
  mentionRgpd: { texte: string; lienLibelle: string };
};

type Colis = { L: string; l: string; h: string; q: string };

const CHAMP =
  'rounded-[14px] border-[1.5px] border-marine/20 bg-ivoire px-3.5 py-3 font-sans text-[15px] text-marine outline-none focus:border-corail';
const CHAMP_MONO =
  'rounded-[14px] border-[1.5px] border-marine/20 bg-ivoire px-3 py-2.5 font-mono text-sm text-marine outline-none focus:border-corail';

function hashRef(str: string): number {
  return Math.abs(str.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
}

const API_URL = process.env.NEXT_PUBLIC_HGWF_API_URL;

export function DevisWizard({ content }: { content: DevisWizardContent }) {
  const c = content;
  const [step, setStep] = useState(1);
  const [type, setType] = useState(0);
  const [destination, setDestination] = useState(c.destinations[0]?.nom ?? '');
  const [depart, setDepart] = useState(c.portsDepart[0] ?? '');
  const [colis, setColis] = useState<Colis[]>([{ L: '', l: '', h: '', q: '1' }]);
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [message, setMessage] = useState('');
  const [envoye, setEnvoye] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [referenceApi, setReferenceApi] = useState<string | null>(null);

  const volume = colis.reduce((t, cl) => {
    const L = parseFloat(cl.L) || 0;
    const l = parseFloat(cl.l) || 0;
    const h = parseFloat(cl.h) || 0;
    const q = parseFloat(cl.q) || 0;
    return t + (L * l * h * q) / 1e6;
  }, 0);
  const volumeAffiche = volume.toFixed(2).replace('.', ',');

  const typeLabel = c.typesEnvoi[type]?.label ?? '';
  const delai = c.destinations.find((d) => d.nom === destination)?.delai ?? '—';
  const reference = referenceApi ?? `HGWF-${new Date().getFullYear()}-${(hashRef(nom + destination) % 9000) + 1000}`;

  const updColis = (i: number, k: keyof Colis, v: string) =>
    setColis((prev) => prev.map((cl, j) => (j === i ? { ...cl, [k]: v } : cl)));

  const dimsColis = () =>
    colis.map((cl) => `${cl.L || '?'} × ${cl.l || '?'} × ${cl.h || '?'} cm × ${cl.q || '1'}`).join(' ; ');

  const envoyerParMail = () => {
    const corps = [
      `${c.recap.libelleType} : ${typeLabel}`,
      `${c.recap.libelleDestination} : ${destination}`,
      `${c.recap.libelleDepart} : ${depart}`,
      `Colis : ${dimsColis()}`,
      `${c.recap.libelleVolume} : ${volumeAffiche} m³`,
      `Référence : ${reference}`,
      '',
      message,
      '',
      `— ${nom}`,
      tel ? `Tél : ${tel}` : '',
      email ? `E-mail : ${email}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    window.location.href = `mailto:${c.emailDestinataire}?subject=${encodeURIComponent(
      `${c.sujetEmail} — ${destination} (${reference})`,
    )}&body=${encodeURIComponent(corps)}`;
  };

  const envoyer = async () => {
    // Envoi direct au back-office quand l'API est configurée ; repli mailto sinon.
    if (API_URL) {
      setEnvoiEnCours(true);
      try {
        const rep = await fetch(`${API_URL}/api/demande-devis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nom,
            email,
            tel,
            message,
            typeEnvoi: typeLabel,
            destination,
            portDepart: depart,
            volume: `${volumeAffiche} m³`,
            colis: dimsColis(),
            website: '',
          }),
        });
        if (rep.ok) {
          const data = (await rep.json()) as { reference?: string };
          setReferenceApi(data.reference ?? null);
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

  const imageEtape = c.imagesEtapes[step - 1] ?? null;

  return (
    <div className="grid overflow-hidden rounded-[28px] border border-marine/12 bg-ivoire shadow-[0_24px_60px_rgba(18,57,91,0.12)] lg:grid-cols-[1.25fr_1fr]">
      {/* Colonne formulaire */}
      <div className="flex min-w-0 flex-col gap-6 px-5 py-8 sm:gap-7 sm:px-8 sm:py-10 md:px-11">
        {/* Étapes */}
        <div className="flex items-center gap-2 sm:gap-3">
          {c.etapeLabels.map((label, i) => {
            const n = i + 1;
            const actif = step === n;
            const fait = step > n;
            return (
              <div key={label} className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => !envoye && setStep(n)}
                  aria-label={label}
                  className={`inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full font-mono text-[13px] ${
                    actif
                      ? 'border-none bg-corail text-marine'
                      : fait
                        ? 'border-none bg-ciel text-ivoire'
                        : 'border-[1.5px] border-marine/25 bg-transparent text-encre-douce'
                  }`}
                >
                  {n}
                </button>
                {/* Libellé masqué sur mobile (place limitée) ; visible dès sm. */}
                <span className={`hidden text-xs font-medium sm:inline ${actif ? 'text-marine' : 'text-encre-douce'}`}>
                  {label}
                </span>
                {n < c.etapeLabels.length && <span className="h-px flex-1 bg-marine/20 sm:w-7 sm:flex-none" aria-hidden="true" />}
              </div>
            );
          })}
        </div>

        {/* Étape 1 : type d'envoi */}
        {step === 1 && (
          <div className="flex flex-col gap-[18px]">
            <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em]">{c.etapeType.titre}</h2>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {c.typesEnvoi.map((t, i) => (
                <button
                  key={t.label}
                  onClick={() => setType(i)}
                  className={`flex cursor-pointer flex-col items-start gap-1.5 rounded-2xl bg-ivoire p-[18px] text-left font-sans text-marine ${
                    type === i
                      ? 'border-2 border-corail shadow-[0_1px_0_rgba(18,57,91,0.08)]'
                      : 'border border-marine/14'
                  }`}
                >
                  <span className="text-base font-bold">{t.label}</span>
                  <span className="text-left text-[13px] leading-normal font-normal text-encre-douce">
                    {t.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Étape 2 : destination */}
        {step === 2 && (
          <div className="flex flex-col gap-[18px]">
            <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em]">{c.etapeDestination.titre}</h2>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                {c.etapeDestination.libelleDestination}
                <select value={destination} onChange={(e) => setDestination(e.target.value)} className={CHAMP}>
                  {c.destinations.map((d) => (
                    <option key={d.nom}>{d.nom}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                {c.etapeDestination.libelleDepart}
                <select value={depart} onChange={(e) => setDepart(e.target.value)} className={CHAMP}>
                  {c.portsDepart.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-baseline gap-3 rounded-[14px] border border-marine/14 bg-creme px-[18px] py-3.5">
              <span className="font-mono text-xs text-corail-texte">{c.etapeDestination.libelleDelai}</span>
              <span className="font-mono text-sm">{delai}</span>
            </div>
          </div>
        )}

        {/* Étape 3 : volume */}
        {step === 3 && (
          <div className="flex flex-col gap-[18px]">
            <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em]">{c.etapeVolume.titre}</h2>
            <p className="m-0 text-sm text-encre-douce">{c.etapeVolume.texte}</p>
            <div className="flex flex-col gap-2.5">
              {colis.map((cl, i) => (
                <div key={i} className="flex items-center gap-1.5 sm:gap-2">
                  <input type="number" min="0" placeholder="L" value={cl.L} onChange={(e) => updColis(i, 'L', e.target.value)} className={`${CHAMP_MONO} min-w-0 flex-1 sm:w-[98px] sm:flex-none`} />
                  <span className="text-encre-douce">×</span>
                  <input type="number" min="0" placeholder="l" value={cl.l} onChange={(e) => updColis(i, 'l', e.target.value)} className={`${CHAMP_MONO} min-w-0 flex-1 sm:w-[98px] sm:flex-none`} />
                  <span className="text-encre-douce">×</span>
                  <input type="number" min="0" placeholder="H" value={cl.h} onChange={(e) => updColis(i, 'h', e.target.value)} className={`${CHAMP_MONO} min-w-0 flex-1 sm:w-[98px] sm:flex-none`} />
                  <span className="text-encre-douce">·</span>
                  <input type="number" min="1" placeholder="Qté" value={cl.q} onChange={(e) => updColis(i, 'q', e.target.value)} className={`${CHAMP_MONO} w-[52px] shrink-0 sm:w-[72px]`} />
                  {colis.length > 1 && (
                    <button
                      onClick={() => setColis((prev) => prev.filter((_, j) => j !== i))}
                      aria-label="Retirer ce colis"
                      className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-marine/14 bg-transparent text-encre-douce"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setColis((prev) => [...prev, { L: '', l: '', h: '', q: '1' }])}
              className="self-start cursor-pointer rounded-full border-[1.5px] border-marine bg-transparent px-5 py-2.5 font-sans text-sm font-medium text-marine transition hover:bg-creme"
            >
              {c.etapeVolume.boutonAjouter}
            </button>
          </div>
        )}

        {/* Étape 4 : coordonnées / confirmation */}
        {step === 4 &&
          (!envoye ? (
            <div className="flex flex-col gap-3.5">
              <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em]">{c.etapeCoordonnees.titre}</h2>
              <input placeholder={c.etapeCoordonnees.placeholderNom} value={nom} onChange={(e) => setNom(e.target.value)} className={CHAMP} />
              <input type="email" placeholder={c.etapeCoordonnees.placeholderEmail} value={email} onChange={(e) => setEmail(e.target.value)} className={CHAMP} />
              <input type="tel" placeholder={c.etapeCoordonnees.placeholderTel} value={tel} onChange={(e) => setTel(e.target.value)} className={CHAMP} />
              <textarea placeholder={c.etapeCoordonnees.placeholderMessage} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className={`${CHAMP} resize-y`} />
            </div>
          ) : (
            <div className="flex flex-col items-start gap-4 py-3">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-or/18">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#FFB23E" strokeWidth="2.5" aria-hidden="true">
                  <path d="M4 12l5 5L20 6" />
                </svg>
              </span>
              <h2 className="m-0 text-[28px] font-bold tracking-[-0.03em]">{c.confirmation.titre}</h2>
              <p className="m-0 max-w-[48ch] text-[15px] leading-[1.55] text-encre-douce">
                {nom ? c.confirmation.texte.replace('{nom}', nom) : c.confirmation.texte.replace(' {nom}', '')}
              </p>
              <span className="font-mono text-2xl tracking-[0.06em] text-corail-texte">{reference}</span>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="rounded-full bg-corail px-6 py-3 text-[15px] font-medium text-marine transition hover:bg-or"
                >
                  {c.confirmation.boutonContact}
                </Link>
                <Link
                  href="/"
                  className="rounded-full border-[1.5px] border-marine px-6 py-3 text-[15px] font-medium text-marine transition hover:bg-marine/6"
                >
                  {c.confirmation.boutonAccueil}
                </Link>
              </div>
            </div>
          ))}

        {/* Navigation étapes */}
        {!envoye && (
          <div className="mt-auto flex flex-col gap-4">
            <div className="flex justify-between gap-4 border-t border-marine/12 pt-[22px]">
              {step > 1 ? (
                <button
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  className="cursor-pointer rounded-full border-[1.5px] border-marine bg-transparent px-6 py-3 font-sans text-[15px] font-medium text-marine transition hover:bg-creme"
                >
                  {c.boutons.precedent}
                </button>
              ) : (
                <span />
              )}
              {step < 4 ? (
                <button
                  onClick={() => setStep((s) => Math.min(4, s + 1))}
                  className="presse cursor-pointer rounded-full border-none bg-corail px-7 py-3 font-sans text-[15px] font-medium text-marine hover:bg-or"
                >
                  {c.boutons.suivant}
                </button>
              ) : (
                <button
                  onClick={envoyer}
                  disabled={envoiEnCours}
                  className="presse cursor-pointer rounded-full border-none bg-corail px-7 py-3 font-sans text-[15px] font-medium text-marine hover:bg-or disabled:opacity-60"
                >
                  {envoiEnCours ? '…' : c.boutons.envoyer}
                </button>
              )}
            </div>
            {/* Mention RGPD : sous le bouton d'envoi de la dernière étape, celle qui déclenche réellement l'envoi. */}
            {step === 4 && (
              <p className="m-0 text-xs leading-[1.5] text-encre-douce">
                {c.mentionRgpd.texte}{' '}
                <Link href="/confidentialite" className="underline">
                  {c.mentionRgpd.lienLibelle}
                </Link>
                .
              </p>
            )}
          </div>
        )}
      </div>

      {/* Colonne visuelle */}
      <div className="relative isolate hidden min-h-[560px] min-w-0 bg-marine lg:block">
        {imageEtape && (
          <Image src={imageEtape} alt="" fill sizes="(min-width: 1024px) 40vw, 0px" className="object-cover" />
        )}
        <span
          className="absolute inset-0 bg-linear-180 from-marine/10 from-0% to-marine/85 to-100%"
          aria-hidden="true"
        />
        <div className="absolute right-6 bottom-6 left-6 flex flex-col gap-2.5 rounded-[20px] border border-creme/30 bg-creme/14 p-[22px] text-creme backdrop-blur-lg">
          <span className="text-[10px] font-medium tracking-[0.32em] text-or uppercase">{c.recap.titre}</span>
          <div className="flex justify-between gap-3 text-sm">
            <span className="opacity-80">{c.recap.libelleType}</span>
            <span className="text-right font-bold">{typeLabel}</span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="opacity-80">{c.recap.libelleDestination}</span>
            <span className="text-right font-bold">{destination}</span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="opacity-80">{c.recap.libelleDepart}</span>
            <span className="text-right font-bold">{depart}</span>
          </div>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="opacity-80">{c.recap.libelleVolume}</span>
            <span className="font-mono text-xl text-or">{volumeAffiche} m³</span>
          </div>
        </div>
      </div>
    </div>
  );
}
