'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';

export type DevisPreset = {
  label: string;
  // Fourchette affichée (« ≈ 1–3 m³ ») ; vide pour les presets sans chiffre
  // (véhicule, « je ne sais pas ») où la description porte l'information.
  estimation: string;
  description: string;
};

export type DevisWizardContent = {
  etapeLabels: string[];
  // « Étape {n} sur {total} » — l'indicateur compact des petits écrans.
  etapeSur: string;
  etapeType: { titre: string };
  etapeDestination: {
    titre: string;
    libelleDestination: string;
    libelleDepart: string;
    libelleDelai: string;
  };
  etapeVolume: {
    titre: string;
    texte: string;
    boutonAjouter: string;
    legendeDims: string;
    commentaireLabel: string;
    commentairePlaceholder: string;
    // Mode simple (par défaut) : estimation par presets ; mode précis : la
    // saisie L × l × H existante. Les deux libellés font la bascule.
    lienModePrecis: string;
    lienModeSimple: string;
    presets: DevisPreset[];
    erreurPreset: string;
    totalLabel: string;
  };
  etapeCoordonnees: {
    titre: string;
    // Une seule règle, annoncée d'entrée : nom + un moyen de contact.
    intro: string;
    placeholderNom: string;
    placeholderEmail: string;
    placeholderTel: string;
    placeholderMessage: string;
    exempleNom: string;
    exempleEmail: string;
    exempleTel: string;
    requis: string;
    unDesDeux: string;
    optionnel: string;
    preferenceLabel: string;
    preferences: string[];
  };
  recap: {
    titre: string;
    libelleType: string;
    libelleDestination: string;
    libelleDepart: string;
    libelleVolume: string;
  };
  confirmation: { titre: string; texte: string; boutonContact: string; boutonAccueil: string };
  boutons: { precedent: string; suivant: string; envoyer: string; envoiEnCours: string };
  typesEnvoi: { label: string; description: string }[];
  destinations: { nom: string; delai: string }[];
  portsDepart: string[];
  imagesEtapes: (string | null)[];
  emailDestinataire: string;
  sujetEmail: string;
  mentionRgpd: { texte: string; lienLibelle: string };
  dimsAria: { longueur: string; largeur: string; hauteur: string; quantite: string };
  erreurNom: string;
  erreurContact: string;
};

type Colis = { L: string; l: string; h: string; q: string };
type ModeVolume = 'simple' | 'precis';

// L'état d'erreur d'un champ est porté par `aria-invalid` et stylé dans
// globals.css : une seule source de vérité pour le contour rouge et pour
// l'annonce du lecteur d'écran.
const CHAMP =
  'rounded-[14px] border-[1.5px] border-marine/20 bg-ivoire px-3.5 py-3 font-sans text-[15px] text-marine outline-none transition-colors focus:border-corail';
const CHAMP_MONO =
  'rounded-[14px] border-[1.5px] border-marine/20 bg-ivoire px-3 py-2.5 font-mono text-sm text-marine outline-none transition-colors focus:border-corail';

const BROUILLON_CLE = 'hgwf-devis-brouillon';

function hashRef(str: string): number {
  return Math.abs(str.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
}

const API_URL = process.env.NEXT_PUBLIC_HGWF_API_URL;

// Pictogramme d'un type d'envoi, choisi par mots-clés du libellé : les types
// viennent du Studio (ordre et nombre libres), un index serait fragile.
function IconeType({ label }: { label: string }) {
  const l = label.toLowerCase();
  let d: string;
  if (l.includes('groupage') || l.includes('lcl'))
    d = 'M3 8l9-5 9 5v8l-9 5-9-5V8zm9-5v10m9-5l-9 5-9-5'; // colis groupés
  else if (l.includes('fcl') || l.includes('complet'))
    d = 'M2 8h20v9H2V8zm4 0v9m4-9v9m4-9v9m4-9v9M4 20h16'; // conteneur rainuré
  else if (l.includes('véhicule') || l.includes('vehicle') || l.includes('bateau') || l.includes('boat'))
    d = 'M4 16l1.5-5h4L12 8h5l2 3h2v5h-2m-11 0h7M5 16a2 2 0 104 0m6 0a2 2 0 104 0H9'; // voiture
  else if (l.includes('déménagement') || l.includes('moving') || l.includes('removal'))
    d = 'M3 11l9-7 9 7v9H3v-9zm6 9v-6h6v6'; // maison
  else if (l.includes('aérien') || l.includes('air'))
    d = 'M10 9L3 12l2 2 5-1 2 7 2-1 1-7 5-2c1-.5 1-2-.5-2L10 9zM3 21h18'; // avion
  else if (l.includes('entrepôt') || l.includes('stockage') || l.includes('storage') || l.includes('warehouse'))
    d = 'M3 9l9-5 9 5v11H3V9zm4 11v-7h10v7m-10-3.5h10'; // entrepôt
  else if (l.includes('conteneur') || l.includes('container'))
    d = 'M2 10h15v7H2v-7zm15 2h4l1 2v3h-5m-13 0a2 2 0 104 0m8 0a2 2 0 104 0'; // camion porte-conteneur
  else d = 'M3 8l9-5 9 5v8l-9 5-9-5V8zm0 0l9 5 9-5m-9 5v8'; // colis
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function DevisWizard({ content }: { content: DevisWizardContent }) {
  const c = content;
  const totalEtapes = c.etapeLabels.length;
  const [step, setStep] = useState(1);
  // Dernière étape atteinte : on revient librement en arrière, on n'avance
  // que par « Suivant » (chaque étape valide la précédente).
  const [maxVisite, setMaxVisite] = useState(1);
  const [type, setType] = useState(0);
  const [destination, setDestination] = useState(c.destinations[0]?.nom ?? '');
  const [depart, setDepart] = useState(c.portsDepart[0] ?? '');
  const [modeVolume, setModeVolume] = useState<ModeVolume>('simple');
  const [preset, setPreset] = useState<number | null>(null);
  const [colis, setColis] = useState<Colis[]>([{ L: '', l: '', h: '', q: '1' }]);
  const [commentaireColis, setCommentaireColis] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [preference, setPreference] = useState(c.etapeCoordonnees.preferences[0] ?? '');
  const [message, setMessage] = useState('');
  const [envoye, setEnvoye] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [referenceApi, setReferenceApi] = useState<string | null>(null);
  const [erreurPreset, setErreurPreset] = useState(false);
  const [erreurs, setErreurs] = useState<{ nom?: boolean; contact?: boolean }>({});
  const [restaure, setRestaure] = useState(false);

  // ── Brouillon : la page se recharge (mobile, retour arrière), la saisie reste.
  useEffect(() => {
    try {
      const brut = sessionStorage.getItem(BROUILLON_CLE);
      if (brut) {
        const b = JSON.parse(brut);
        if (typeof b.type === 'number' && b.type < c.typesEnvoi.length) setType(b.type);
        if (typeof b.destination === 'string' && b.destination) setDestination(b.destination);
        if (typeof b.depart === 'string' && b.depart) setDepart(b.depart);
        if (b.modeVolume === 'simple' || b.modeVolume === 'precis') setModeVolume(b.modeVolume);
        if (typeof b.preset === 'number' && b.preset < c.etapeVolume.presets.length) setPreset(b.preset);
        if (Array.isArray(b.colis) && b.colis.length) setColis(b.colis);
        if (typeof b.commentaireColis === 'string') setCommentaireColis(b.commentaireColis);
        if (typeof b.nom === 'string') setNom(b.nom);
        if (typeof b.email === 'string') setEmail(b.email);
        if (typeof b.tel === 'string') setTel(b.tel);
        if (typeof b.preference === 'string' && b.preference) setPreference(b.preference);
        if (typeof b.message === 'string') setMessage(b.message);
      }
    } catch {
      // brouillon illisible : on repart de zéro
    }
    setRestaure(true);
    // Contenu stable sur la durée de vie de la page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restaure || envoye) return;
    try {
      sessionStorage.setItem(
        BROUILLON_CLE,
        JSON.stringify({ type, destination, depart, modeVolume, preset, colis, commentaireColis, nom, email, tel, preference, message }),
      );
    } catch {
      // stockage plein ou bloqué : le formulaire fonctionne sans brouillon
    }
  }, [restaure, envoye, type, destination, depart, modeVolume, preset, colis, commentaireColis, nom, email, tel, preference, message]);

  // ── Focus : au changement d'étape, le titre ; à la confirmation, le titre.
  const titreEtape = useRef<HTMLHeadingElement>(null);
  const titreConfirmation = useRef<HTMLHeadingElement>(null);
  const etapePrecedente = useRef(step);
  useEffect(() => {
    if (etapePrecedente.current !== step) {
      etapePrecedente.current = step;
      titreEtape.current?.focus();
    }
  }, [step]);
  useEffect(() => {
    if (envoye) titreConfirmation.current?.focus();
  }, [envoye]);

  const volume = colis.reduce((t, cl) => {
    const L = parseFloat(cl.L) || 0;
    const l = parseFloat(cl.l) || 0;
    const h = parseFloat(cl.h) || 0;
    const q = parseFloat(cl.q) || 0;
    return t + (L * l * h * q) / 1e6;
  }, 0);
  const volumePrecis = `${volume.toFixed(2).replace('.', ',')} m³`;
  const presetChoisi = preset !== null ? c.etapeVolume.presets[preset] : null;
  // Ce que voient le récap et le back-office : la fourchette du preset, son
  // libellé à défaut de chiffre, ou le m³ calculé en mode précis.
  const volumeAffiche =
    modeVolume === 'simple' ? (presetChoisi ? presetChoisi.estimation || presetChoisi.label : '—') : volumePrecis;
  const volumeEnvoi =
    modeVolume === 'simple'
      ? presetChoisi
        ? `${presetChoisi.estimation ? `${presetChoisi.estimation} — ` : ''}${presetChoisi.label}`
        : '—'
      : volumePrecis;

  const typeLabel = c.typesEnvoi[type]?.label ?? '';
  const delai = c.destinations.find((d) => d.nom === destination)?.delai ?? '…';
  const reference = referenceApi ?? `HGWF-${new Date().getFullYear()}-${(hashRef(nom + destination) % 9000) + 1000}`;

  const updColis = (i: number, k: keyof Colis, v: string) =>
    setColis((prev) => prev.map((cl, j) => (j === i ? { ...cl, [k]: v } : cl)));

  const dimsColis = () =>
    modeVolume === 'simple'
      ? presetChoisi
        ? presetChoisi.label
        : '—'
      : colis.map((cl) => `${cl.L || '?'} × ${cl.l || '?'} × ${cl.h || '?'} cm × ${cl.q || '1'}`).join(' ; ');

  // ── Navigation : chaque étape valide avant de céder la place.
  const valideEtape = (n: number): boolean => {
    if (n === 3 && modeVolume === 'simple' && preset === null) {
      setErreurPreset(true);
      return false;
    }
    return true;
  };

  const suivant = () => {
    if (!valideEtape(step)) return;
    const n = Math.min(totalEtapes, step + 1);
    setStep(n);
    setMaxVisite((m) => Math.max(m, n));
  };

  const allerA = (n: number) => {
    if (envoye || n > maxVisite) return;
    if (n > step && !valideEtape(step)) return;
    setStep(n);
  };

  // Choisir un service suffit : l'étape n'a qu'une question, on enchaîne.
  // Le léger délai laisse voir la carte se sélectionner.
  const autoAvance = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (autoAvance.current) clearTimeout(autoAvance.current); }, []);
  const choisirType = (i: number) => {
    setType(i);
    if (autoAvance.current) clearTimeout(autoAvance.current);
    autoAvance.current = setTimeout(() => {
      setStep(2);
      setMaxVisite((m) => Math.max(m, 2));
    }, 260);
  };

  const choisirPreset = (i: number) => {
    setPreset(i);
    setErreurPreset(false);
  };

  // Entrée dans un champ = « Suivant » : le clavier suit le fil du formulaire.
  const surEntree = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (step < totalEtapes) suivant();
      else void envoyer();
    }
  };

  const envoyerParMail = () => {
    const corps = [
      `${c.recap.libelleType} : ${typeLabel}`,
      `${c.recap.libelleDestination} : ${destination}`,
      `${c.recap.libelleDepart} : ${depart}`,
      `Colis : ${dimsColis()}`,
      commentaireColis ? `Remarques colis : ${commentaireColis}` : '',
      `${c.recap.libelleVolume} : ${volumeEnvoi}`,
      `Référence : ${reference}`,
      '',
      message,
      '',
      nom,
      tel ? `Tél : ${tel}` : '',
      email ? `E-mail : ${email}` : '',
      preference ? `Préférence de contact : ${preference}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    window.location.href = `mailto:${c.emailDestinataire}?subject=${encodeURIComponent(
      `${c.sujetEmail} · ${destination} (${reference})`,
    )}&body=${encodeURIComponent(corps)}`;
  };

  const envoyer = async () => {
    // Même règle que l'API : un nom et au moins un moyen de contact — mais
    // signalée champ par champ, au moment où l'utilisateur peut agir.
    const manqueNom = !nom.trim();
    const manqueContact = !email.trim() && !tel.trim();
    if (manqueNom || manqueContact) {
      setErreurs({ nom: manqueNom, contact: manqueContact });
      setStep(totalEtapes);
      return;
    }
    setErreurs({});

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
            preference,
            message,
            typeEnvoi: typeLabel,
            destination,
            portDepart: depart,
            volume: volumeEnvoi,
            colis: dimsColis(),
            commentaireColis,
            website: '',
          }),
        });
        if (rep.ok) {
          const data = (await rep.json()) as { reference?: string };
          setReferenceApi(data.reference ?? null);
          setEnvoye(true);
          try { sessionStorage.removeItem(BROUILLON_CLE); } catch { /* sans conséquence */ }
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
    try { sessionStorage.removeItem(BROUILLON_CLE); } catch { /* sans conséquence */ }
  };

  const imageEtape = c.imagesEtapes[step - 1] ?? null;
  const etapeSurTexte = c.etapeSur.replace('{n}', String(step)).replace('{total}', String(totalEtapes));

  const lignesRecap: { libelle: string; valeur: string; classe?: string }[] = [
    { libelle: c.recap.libelleType, valeur: typeLabel },
    { libelle: c.recap.libelleDestination, valeur: destination },
    { libelle: c.recap.libelleDepart, valeur: depart },
    { libelle: c.etapeDestination.libelleDelai, valeur: delai, classe: 'font-mono text-[13px] text-ciel' },
  ];

  return (
    <div className="grid overflow-hidden rounded-[28px] border border-marine/12 bg-ivoire shadow-[0_24px_60px_rgba(18,57,91,0.12)] lg:grid-cols-[1.25fr_1fr]">
      {/* Colonne formulaire */}
      <div className="flex min-w-0 flex-col gap-6 px-5 py-8 sm:gap-7 sm:px-8 sm:py-10 md:px-11">
        {/* Fil d'étapes : compteur + barre sur mobile, pastilles nommées dès sm.
            Les étapes déjà visitées se rejoignent d'un clic, les suivantes
            attendent « Suivant » (l'ordre porte la validation). */}
        {!envoye && (
          <nav aria-label={etapeSurTexte}>
            <div className="flex items-baseline justify-between sm:hidden">
              <span className="text-[13px] font-bold text-marine">{c.etapeLabels[step - 1]}</span>
              <span className="font-mono text-[11px] tracking-[0.08em] text-encre-douce uppercase">{etapeSurTexte}</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-marine/10 sm:hidden" aria-hidden="true">
              <div
                className="h-full rounded-full bg-corail transition-[width] duration-300 ease-[var(--ease-out-quart)]"
                style={{ width: `${(step / totalEtapes) * 100}%` }}
              />
            </div>
            <ol className="m-0 hidden list-none items-center gap-3 p-0 sm:flex">
              {c.etapeLabels.map((label, i) => {
                const n = i + 1;
                const actif = step === n;
                const fait = step > n;
                const accessible = n <= maxVisite;
                return (
                  <li key={label} className="flex items-center gap-3">
                    <button
                      onClick={() => allerA(n)}
                      disabled={!accessible}
                      aria-label={`${label}${fait ? ' ✓' : ''}`}
                      aria-current={actif ? 'step' : undefined}
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mono text-[13px] transition-colors ${
                        actif
                          ? 'border-none bg-corail text-marine'
                          : fait
                            ? 'cursor-pointer border-none bg-marine text-ivoire'
                            : accessible
                              ? 'cursor-pointer border-[1.5px] border-marine/25 bg-transparent text-encre-douce'
                              : 'border-[1.5px] border-marine/15 bg-transparent text-marine/35'
                      }`}
                    >
                      {fait ? (
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                          <path d="M4 12l5 5L20 6" />
                        </svg>
                      ) : (
                        n
                      )}
                    </button>
                    <span className={`text-xs font-medium ${actif ? 'text-marine' : accessible ? 'text-encre-douce' : 'text-marine/35'}`}>
                      {label}
                    </span>
                    {n < totalEtapes && <span className={`h-px w-7 ${fait ? 'bg-marine/45' : 'bg-marine/20'}`} aria-hidden="true" />}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {/* Récap compact : la colonne visuelle est masquée sous lg, ce bandeau
            garde l'envoi sous les yeux sur mobile et tablette. */}
        {!envoye && (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[14px] bg-marine px-4 py-3 text-creme lg:hidden">
            <span className="text-[10px] font-bold tracking-[0.28em] text-or uppercase">{c.recap.titre}</span>
            <span className="text-[13px] font-medium">{typeLabel}</span>
            <span className="text-creme/40" aria-hidden="true">·</span>
            <span className="text-[13px] font-medium">{destination}</span>
            <span className="ml-auto font-mono text-[15px] font-bold text-or">{volumeAffiche}</span>
          </div>
        )}

        {/* Étape 1 : type d'envoi — choisir enchaîne sur l'étape suivante. */}
        {step === 1 && (
          <div key="etape-1" className="etape-entre flex flex-col gap-[18px]">
            <h2 ref={titreEtape} tabIndex={-1} className="m-0 text-[22px] font-bold tracking-[-0.02em] outline-none">
              {c.etapeType.titre}
            </h2>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {c.typesEnvoi.map((t, i) => (
                <button
                  key={t.label}
                  onClick={() => choisirType(i)}
                  aria-pressed={type === i}
                  className={`presse flex cursor-pointer items-start gap-3.5 rounded-2xl bg-ivoire p-[18px] text-left font-sans text-marine transition-colors ${
                    type === i
                      ? 'border-2 border-corail shadow-[0_1px_0_rgba(18,57,91,0.08)]'
                      : 'border border-marine/14 hover:border-marine/30'
                  }`}
                >
                  <span className={`mt-0.5 shrink-0 ${type === i ? 'text-corail-texte' : 'text-ciel'}`}>
                    <IconeType label={t.label} />
                  </span>
                  <span className="flex flex-col gap-1.5">
                    <span className="text-base font-bold">{t.label}</span>
                    <span className="text-left text-[13px] leading-normal font-normal text-encre-douce">
                      {t.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Étape 2 : destination */}
        {step === 2 && (
          <div key="etape-2" className="etape-entre flex flex-col gap-[18px]">
            <h2 ref={titreEtape} tabIndex={-1} className="m-0 text-[22px] font-bold tracking-[-0.02em] outline-none">
              {c.etapeDestination.titre}
            </h2>
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
            {/* Le délai réel, mis à jour avec la destination : la réassurance
                est dans la précision, pas dans la promesse. */}
            <div className="flex flex-wrap items-baseline gap-3 rounded-[14px] border border-marine/14 bg-creme px-[18px] py-3.5" aria-live="polite">
              <span className="font-mono text-xs text-corail-texte">{c.etapeDestination.libelleDelai}</span>
              <span className="font-mono text-sm">{delai}</span>
            </div>
          </div>
        )}

        {/* Étape 3 : volume — estimation rapide par défaut, dimensions exactes
            pour qui les connaît. Les deux nourrissent le même devis. */}
        {step === 3 && (
          <div key="etape-3" className="etape-entre flex flex-col gap-[18px]">
            <h2 ref={titreEtape} tabIndex={-1} className="m-0 text-[22px] font-bold tracking-[-0.02em] outline-none">
              {c.etapeVolume.titre}
            </h2>

            {modeVolume === 'simple' ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label={c.etapeVolume.titre}>
                  {c.etapeVolume.presets.map((p, i) => (
                    <button
                      key={p.label}
                      onClick={() => choisirPreset(i)}
                      role="radio"
                      aria-checked={preset === i}
                      className={`presse flex cursor-pointer flex-col gap-1 rounded-2xl bg-ivoire p-4 text-left font-sans text-marine transition-colors ${
                        preset === i
                          ? 'border-2 border-corail shadow-[0_1px_0_rgba(18,57,91,0.08)]'
                          : 'border border-marine/14 hover:border-marine/30'
                      }`}
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-[15px] font-bold">{p.label}</span>
                        {p.estimation && (
                          <span className="shrink-0 font-mono text-[13px] font-bold text-corail-texte">{p.estimation}</span>
                        )}
                      </span>
                      <span className="text-[13px] leading-normal text-encre-douce">{p.description}</span>
                    </button>
                  ))}
                </div>
                {erreurPreset && (
                  <p role="alert" className="m-0 text-[13px] font-medium text-corail-texte">
                    {c.etapeVolume.erreurPreset}
                  </p>
                )}
                <button
                  onClick={() => setModeVolume('precis')}
                  className="self-start cursor-pointer border-none bg-transparent p-0 text-[13px] font-medium text-marine underline underline-offset-4 hover:text-corail-texte"
                >
                  {c.etapeVolume.lienModePrecis}
                </button>
              </>
            ) : (
              <>
                <p className="m-0 text-sm text-encre-douce">{c.etapeVolume.texte}</p>
                <span className="font-mono text-[11px] tracking-[0.04em] text-encre-douce uppercase">
                  {c.etapeVolume.legendeDims}
                </span>
                <div className="flex flex-col gap-2.5">
                  {colis.map((cl, i) => (
                    <div key={i} className="flex items-center gap-1.5 sm:gap-2">
                      <input type="number" min="0" placeholder="L (cm)" aria-label={c.dimsAria.longueur} value={cl.L} onChange={(e) => updColis(i, 'L', e.target.value)} onKeyDown={surEntree} className={`${CHAMP_MONO} min-w-0 flex-1 sm:w-[104px] sm:flex-none`} />
                      <span className="text-encre-douce" aria-hidden="true">×</span>
                      <input type="number" min="0" placeholder="l (cm)" aria-label={c.dimsAria.largeur} value={cl.l} onChange={(e) => updColis(i, 'l', e.target.value)} onKeyDown={surEntree} className={`${CHAMP_MONO} min-w-0 flex-1 sm:w-[104px] sm:flex-none`} />
                      <span className="text-encre-douce" aria-hidden="true">×</span>
                      <input type="number" min="0" placeholder="H (cm)" aria-label={c.dimsAria.hauteur} value={cl.h} onChange={(e) => updColis(i, 'h', e.target.value)} onKeyDown={surEntree} className={`${CHAMP_MONO} min-w-0 flex-1 sm:w-[104px] sm:flex-none`} />
                      <span className="text-encre-douce" aria-hidden="true">·</span>
                      <input type="number" min="1" placeholder="Qté" aria-label={c.dimsAria.quantite} value={cl.q} onChange={(e) => updColis(i, 'q', e.target.value)} onKeyDown={surEntree} className={`${CHAMP_MONO} w-[52px] shrink-0 sm:w-[72px]`} />
                      {colis.length > 1 && (
                        <button
                          onClick={() => setColis((prev) => prev.filter((_, j) => j !== i))}
                          aria-label="Retirer ce colis"
                          className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-marine/14 bg-transparent text-encre-douce transition-colors hover:border-corail-texte hover:text-corail-texte"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setColis((prev) => [...prev, { L: '', l: '', h: '', q: '1' }])}
                    className="presse cursor-pointer rounded-full border-[1.5px] border-marine bg-transparent px-5 py-2.5 font-sans text-sm font-medium text-marine transition hover:bg-creme"
                  >
                    {c.etapeVolume.boutonAjouter}
                  </button>
                  {/* Le m³ se calcule sous les yeux : la saisie a une récompense immédiate. */}
                  <span className="ml-auto rounded-full bg-marine px-4 py-2 font-mono text-[13px] font-bold text-or" aria-live="polite">
                    {c.etapeVolume.totalLabel} {volumePrecis}
                  </span>
                </div>
                <button
                  onClick={() => setModeVolume('simple')}
                  className="self-start cursor-pointer border-none bg-transparent p-0 text-[13px] font-medium text-marine underline underline-offset-4 hover:text-corail-texte"
                >
                  {c.etapeVolume.lienModeSimple}
                </button>
              </>
            )}

            <label className="flex flex-col gap-1.5 text-[13px] font-medium">
              {c.etapeVolume.commentaireLabel}
              <textarea
                rows={3}
                value={commentaireColis}
                onChange={(e) => setCommentaireColis(e.target.value)}
                placeholder={c.etapeVolume.commentairePlaceholder}
                className={`${CHAMP} resize-y`}
              />
            </label>
          </div>
        )}

        {/* Étape 4 : coordonnées / confirmation */}
        {step === 4 &&
          (!envoye ? (
            <div key="etape-4" className="etape-entre flex flex-col gap-3.5">
              <h2 ref={titreEtape} tabIndex={-1} className="m-0 text-[22px] font-bold tracking-[-0.02em] outline-none">
                {c.etapeCoordonnees.titre}
              </h2>
              {/* La règle du jeu annoncée avant la saisie, pas après l'erreur. */}
              <p className="m-0 text-sm text-encre-douce">{c.etapeCoordonnees.intro}</p>
              <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                <span>
                  {c.etapeCoordonnees.placeholderNom}{' '}
                  <span className="font-normal text-encre-douce">· {c.etapeCoordonnees.requis}</span>
                </span>
                <input
                  value={nom}
                  onChange={(e) => { setNom(e.target.value); if (erreurs.nom) setErreurs((er) => ({ ...er, nom: false })); }}
                  onKeyDown={surEntree}
                  autoComplete="name"
                  placeholder={c.etapeCoordonnees.exempleNom}
                  aria-invalid={erreurs.nom || undefined}
                  aria-describedby={erreurs.nom ? 'erreur-nom' : undefined}
                  className={CHAMP}
                />
                {erreurs.nom && (
                  <span id="erreur-nom" role="alert" className="font-medium text-corail-texte">
                    {c.erreurNom}
                  </span>
                )}
              </label>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                  <span>
                    {c.etapeCoordonnees.placeholderEmail}{' '}
                    <span className="font-normal text-encre-douce">· {c.etapeCoordonnees.unDesDeux}</span>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (erreurs.contact) setErreurs((er) => ({ ...er, contact: false })); }}
                    onKeyDown={surEntree}
                    autoComplete="email"
                    inputMode="email"
                    placeholder={c.etapeCoordonnees.exempleEmail}
                    aria-invalid={erreurs.contact || undefined}
                    aria-describedby={erreurs.contact ? 'erreur-contact' : undefined}
                    className={CHAMP}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                  <span>
                    {c.etapeCoordonnees.placeholderTel}{' '}
                    <span className="font-normal text-encre-douce">· {c.etapeCoordonnees.unDesDeux}</span>
                  </span>
                  <input
                    type="tel"
                    value={tel}
                    onChange={(e) => { setTel(e.target.value); if (erreurs.contact) setErreurs((er) => ({ ...er, contact: false })); }}
                    onKeyDown={surEntree}
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder={c.etapeCoordonnees.exempleTel}
                    aria-invalid={erreurs.contact || undefined}
                    aria-describedby={erreurs.contact ? 'erreur-contact' : undefined}
                    className={CHAMP}
                  />
                </label>
              </div>
              {erreurs.contact && (
                <p id="erreur-contact" role="alert" className="m-0 text-[13px] font-medium text-corail-texte">
                  {c.erreurContact}
                </p>
              )}
              {/* Préférence de contact : groupe radio rendu en pastilles. */}
              <fieldset className="m-0 flex flex-col gap-2 border-none p-0">
                <legend className="mb-1.5 p-0 text-[13px] font-medium">{c.etapeCoordonnees.preferenceLabel}</legend>
                <div className="flex flex-wrap gap-2">
                  {c.etapeCoordonnees.preferences.map((p) => (
                    <label
                      key={p}
                      className={`presse cursor-pointer rounded-full px-5 py-2.5 text-sm font-medium transition ${
                        preference === p
                          ? 'bg-corail text-marine shadow-[0_1px_0_rgba(18,57,91,0.08)]'
                          : 'border-[1.5px] border-marine/25 bg-transparent text-encre-douce hover:bg-creme'
                      }`}
                    >
                      <input
                        type="radio"
                        name="preference-contact"
                        value={p}
                        checked={preference === p}
                        onChange={() => setPreference(p)}
                        className="sr-only"
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                <span>
                  {c.etapeCoordonnees.placeholderMessage}{' '}
                  <span className="font-normal text-encre-douce">· {c.etapeCoordonnees.optionnel}</span>
                </span>
                <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className={`${CHAMP} resize-y`} />
              </label>
            </div>
          ) : (
            <div className="etape-entre flex flex-col items-start gap-4 py-3">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-or/18">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fdb53d" strokeWidth="2.5" aria-hidden="true">
                  <path d="M4 12l5 5L20 6" />
                </svg>
              </span>
              <h2 ref={titreConfirmation} tabIndex={-1} className="m-0 text-[28px] font-bold tracking-[-0.03em] outline-none">
                {c.confirmation.titre}
              </h2>
              <p className="m-0 max-w-[48ch] text-[15px] leading-[1.55] text-encre-douce">
                {nom ? c.confirmation.texte.replace('{nom}', nom) : c.confirmation.texte.replace(' {nom}', '')}
              </p>
              <span className="font-mono text-2xl tracking-[0.06em] text-corail-texte">{reference}</span>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="presse rounded-full bg-corail px-6 py-3 text-[15px] font-medium text-marine transition hover:bg-or"
                >
                  {c.confirmation.boutonContact}
                </Link>
                <Link
                  href="/"
                  className="presse rounded-full border-[1.5px] border-marine px-6 py-3 text-[15px] font-medium text-marine transition hover:bg-marine/6"
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
                  className="presse cursor-pointer rounded-full border-[1.5px] border-marine bg-transparent px-6 py-3 font-sans text-[15px] font-medium text-marine transition hover:bg-creme"
                >
                  {c.boutons.precedent}
                </button>
              ) : (
                <span />
              )}
              {step < totalEtapes ? (
                <button
                  onClick={suivant}
                  className="presse cursor-pointer rounded-full border-none bg-corail px-7 py-3 font-sans text-[15px] font-medium text-marine hover:bg-or"
                >
                  {c.boutons.suivant}
                </button>
              ) : (
                <button
                  onClick={envoyer}
                  disabled={envoiEnCours}
                  aria-busy={envoiEnCours || undefined}
                  className="presse inline-flex cursor-pointer items-center gap-2.5 rounded-full border-none bg-corail px-7 py-3 font-sans text-[15px] font-medium text-marine hover:bg-or disabled:cursor-default disabled:opacity-60"
                >
                  {envoiEnCours && (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" className="animation-roue" aria-hidden="true">
                      <path d="M12 3a9 9 0 109 9" strokeLinecap="round" />
                    </svg>
                  )}
                  {envoiEnCours ? c.boutons.envoiEnCours : c.boutons.envoyer}
                </button>
              )}
            </div>
            {/* Mention RGPD : sous le bouton d'envoi de la dernière étape, celle qui déclenche réellement l'envoi. */}
            {step === totalEtapes && (
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
        {/* Récapitulatif : carte pleine (plus de verre dépoli) pour rester
            parfaitement lisible quelle que soit la photo derrière. */}
        <div className="absolute right-6 bottom-6 left-6 flex flex-col gap-3 rounded-[20px] border-2 border-or/60 bg-marine p-6 text-creme shadow-[0_18px_44px_rgba(6,20,34,0.5)]">
          <span className="text-[11px] font-bold tracking-[0.32em] text-or uppercase">{c.recap.titre}</span>
          {lignesRecap.map((ligne) => (
            <div key={ligne.libelle} className="flex justify-between gap-3 border-b border-creme/12 pb-2.5 text-[15px]">
              <span className="text-creme/70">{ligne.libelle}</span>
              <span className={`text-right font-bold ${ligne.classe ?? ''}`}>{ligne.valeur}</span>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-3 text-[15px]">
            <span className="text-creme/70">{c.recap.libelleVolume}</span>
            <span className={`text-right font-mono font-bold text-or ${volumeAffiche.length > 12 ? 'text-[17px]' : 'text-[26px]'}`}>
              {volumeAffiche}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
