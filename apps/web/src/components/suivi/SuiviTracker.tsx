'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Globe, type GlobeMarker, type GlobeArc } from './Globe';

export type SuiviEtapeContent = {
  jalon: string;
  statut: string;
  position: string;
  chipA: string | null;
  chipB: string | null;
  imageUrl: string | null;
};

export type SuiviTrajetContent = {
  destination: string;
  destinationCourt: string;
  navire: string;
  positionMer: string;
  latMer: number;
  lonMer: number;
  latArrivee: number;
  lonArrivee: number;
  cap: number;
};

export type SuiviTrackerContent = {
  hero: {
    eyebrow: string;
    titre: string;
    titreAccent: string;
    description: string;
    placeholderRecherche: string;
    boutonRecherche: string;
    noteDemo: string;
    imageUrl: string | null;
  };
  resultat: {
    libelleLatitude: string;
    libelleLongitude: string;
    libelleSignal: string;
    cartePosition: string;
    carteNavire: string;
    carteProgression: string;
    carteEta: string;
    noteContact: string;
    noteContactLien: string;
    positionAvantDepart: string;
    navireAttente: string;
    suffixeDebarque: string;
    libelleVitesse: string;
    libelleCap: string;
  };
  etapes: SuiviEtapeContent[];
  trajets: SuiviTrajetContent[];
  portDepart: string;
  contactHref: string;
  numeroDefaut: string;
};

// Icônes des 5 jalons (tracés SVG de la maquette)
const ICONES_JALONS = [
  'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 22V13',
  'M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 0v16M5 11H2a10 10 0 0 0 20 0h-3',
  'M2 13c2-3.5 4-3.5 6 0s4 3.5 6 0 4-3.5 6 0M2 19c2-3.5 4-3.5 6 0s4 3.5 6 0 4-3.5 6 0',
  'M4 21V4h12l-2.5 4L16 12H4',
  'M4 12l5 5L20 6',
];

const DATES_DEMO = ['12/06', '19/06', '26/06', '08/07', '11/07'];

const BADGE_CLASSES = [
  'bg-creme text-marine border border-marine/20',
  'bg-ciel/15 text-marine',
  'bg-ciel/15 text-marine',
  'bg-or/20 text-marine',
  'bg-marine text-creme',
];

const ROSNY: [number, number] = [48.87, 2.48];
const HAVRE: [number, number] = [49.49, 0.11];

function hashNumero(str: string): number {
  return Math.abs(str.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
}

function dms(val: number, posSuffix: string, negSuffix: string): string {
  const suffix = val >= 0 ? posSuffix : negSuffix;
  const a = Math.abs(val);
  const deg = Math.floor(a);
  const min = (a - deg) * 60;
  return `${deg}°${min.toFixed(2).padStart(5, '0')}'${suffix}`;
}

const API_URL = process.env.NEXT_PUBLIC_HGWF_API_URL;

// Expédition réelle renvoyée par l'API (jamais de données client).
type ExpeditionReelle = { reference: string; trajet: string; etape: number; eta: string };

/**
 * Visuel de statut pour les étapes hors « en mer » : image représentative
 * (éditable au CMS) surmontée d'un médaillon d'icône + libellé de statut.
 * Sans image, un fond marine dégradé prend le relais — jamais de case vide.
 */
function VisuelEtape({
  imageUrl,
  iconePath,
  statut,
  livre,
}: {
  imageUrl: string | null;
  iconePath: string;
  statut: string;
  livre: boolean;
}) {
  return (
    <div className="relative flex aspect-square w-full max-w-[280px] items-center justify-center overflow-hidden rounded-2xl bg-marine-abysse">
      {imageUrl && (
        <Image src={imageUrl} alt="" fill sizes="280px" className="object-cover" />
      )}
      <span
        className="absolute inset-0 bg-linear-180 from-marine/45 from-0% to-marine/85 to-100%"
        aria-hidden="true"
      />
      <div className="relative z-[1] flex flex-col items-center gap-3 px-4 text-center">
        <span
          className={`relative inline-flex h-[68px] w-[68px] items-center justify-center rounded-full ${
            livre ? 'bg-ciel text-marine-abysse' : 'bg-corail text-marine'
          }`}
        >
          <span
            className={`absolute inset-0 rounded-full ${livre ? 'bg-ciel' : 'bg-corail'}`}
            style={{ animation: 'marker-pulse 2.4s ease-out infinite', transformOrigin: 'center' }}
            aria-hidden="true"
          />
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="relative"
            aria-hidden="true"
          >
            <path d={iconePath} />
          </svg>
        </span>
        <span className="text-[13px] font-bold tracking-[0.08em] text-creme uppercase">{statut}</span>
      </div>
    </div>
  );
}

export function SuiviTracker({ content }: { content: SuiviTrackerContent }) {
  const { hero, resultat, etapes, trajets, portDepart, contactHref, numeroDefaut } = content;

  const [numero, setNumero] = useState(numeroDefaut);
  const [affiche, setAffiche] = useState(numeroDefaut);
  const [tick, setTick] = useState(0);
  const [horloge, setHorloge] = useState<string | null>(null);
  const [reel, setReel] = useState<ExpeditionReelle | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      // Onglet caché : inutile de re-rendre toute la carte chaque seconde
      // pour une horloge que personne ne regarde.
      if (document.hidden) return;
      setTick((t) => t + 1);
      const d = new Date();
      const pad2 = (n: number) => String(n).padStart(2, '0');
      setHorloge(`${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const h = hashNumero(affiche.trim().toUpperCase() || 'HGWF');
  // La page garantit trajets non vide et exactement 5 étapes (mêmes bornes que h % n).
  // Expédition réelle trouvée : on tente de rattacher un trajet CMS (coordonnées,
  // navire) via la destination ; sinon on garde la géométrie de démonstration.
  const trajetDemo = trajets[h % trajets.length]!;
  const trajet = reel
    ? (trajets.find((t) => {
        const cible = reel.trajet.toLowerCase();
        return (
          cible.includes(t.destination.toLowerCase()) || cible.includes(t.destinationCourt.toLowerCase())
        );
      }) ?? trajetDemo)
    : trajetDemo;
  const etape = reel ? Math.min(4, Math.max(0, reel.etape)) : h % 5;
  const etapeContent = etapes[etape]!;
  const etapeLivre = etapes[4]!;

  const jour = 6 + (h % 18);
  const enMer = etape === 2;

  const base: [number, number] =
    etape === 0
      ? ROSNY
      : etape === 1
        ? HAVRE
        : etape === 2
          ? [trajet.latMer, trajet.lonMer]
          : [trajet.latArrivee, trajet.lonArrivee];

  const lat = base[0] + (enMer ? 0.02 * Math.sin(tick / 3) - ((0.004 * tick) % 0.4) : 0);
  const lon = base[1] + (enMer ? 0.03 * Math.cos(tick / 4) : 0);
  const vitesseNd = enMer ? `${(14 + (h % 4) + 0.6 * Math.sin(tick / 2)).toFixed(1)} ND` : '0.0 ND';
  const capLive = trajet.cap + Math.round(2 * Math.sin(tick / 5));

  const chipA = etapeContent.chipA ?? `${resultat.libelleVitesse} ${vitesseNd}`;
  const chipB = etapeContent.chipB ?? `${resultat.libelleCap} ${capLive}°`;

  const positionCarte =
    etape === 4 ? etapeLivre.position.toUpperCase() : etape >= 2 ? trajet.positionMer : resultat.positionAvantDepart;
  const navireCarte =
    etape >= 2 && etape < 4
      ? trajet.navire
      : etape >= 4
        ? `${trajet.navire} ${resultat.suffixeDebarque}`
        : resultat.navireAttente;
  const eta = reel
    ? reel.eta || '—'
    : etape === 4
      ? (etapeLivre.chipA ?? '—')
      : `${String(jour).padStart(2, '0')}/08/2026 · 06:40`;
  const progression = `${Math.round((etape / 4) * 100)} %`;

  const trajetAffiche = reel ? reel.trajet : `${portDepart} → ${trajet.destination}`;
  const trajetMono = reel
    ? reel.trajet.toUpperCase()
    : `${portDepart.toUpperCase()} → ${trajet.destinationCourt}`;

  const chercher = async () => {
    setAffiche(numero);
    // Recherche d'une expédition réelle via l'API ; sinon, démonstration.
    if (!API_URL) {
      setReel(null);
      return;
    }
    try {
      const rep = await fetch(`${API_URL}/api/suivi?ref=${encodeURIComponent(numero)}`);
      if (rep.ok) {
        const data = (await rep.json()) as ExpeditionReelle & { ok: boolean };
        if (data.ok) {
          setReel({ reference: data.reference, trajet: data.trajet, etape: data.etape, eta: data.eta });
          return;
        }
      }
    } catch {
      // API injoignable : démonstration
    }
    setReel(null);
  };

  // Marqueurs du globe : Le Havre (hub de départ, or) + toutes les destinations
  // (réseau en ciel), la destination suivie ressortant en corail plus gros.
  // Recalculé seulement quand la destination change (pas à chaque frappe).
  const OR: [number, number, number] = [253 / 255, 181 / 255, 61 / 255];
  const CORAIL: [number, number, number] = [253 / 255, 127 / 255, 90 / 255];
  const CIEL: [number, number, number] = [81 / 255, 165 / 255, 221 / 255];
  const LE_HAVRE: [number, number] = [49.49, 0.11];

  const globeMarkers: GlobeMarker[] = useMemo(() => {
    const destinations = trajets.map((t) => {
      const suivie = t.destinationCourt === trajet.destinationCourt;
      return {
        location: [t.latArrivee, t.lonArrivee] as [number, number],
        size: suivie ? 0.12 : 0.05,
        color: suivie ? CORAIL : CIEL,
      };
    });
    return [{ location: LE_HAVRE, size: 0.08, color: OR }, ...destinations];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trajets, trajet.destinationCourt]);

  // Arc de la route maritime : du Havre jusqu'à la destination suivie.
  const globeArcs: GlobeArc[] = useMemo(
    () => [{ from: LE_HAVRE, to: [trajet.latArrivee, trajet.lonArrivee] }],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trajet.latArrivee, trajet.lonArrivee],
  );

  return (
    <>
      {/* Hero photo + recherche */}
      <header>
        <div className="hero-photo relative isolate flex min-h-[500px] flex-col justify-center overflow-hidden px-5 pt-32 pb-24 sm:min-h-[540px] sm:px-8 sm:pt-[150px] sm:pb-[110px] md:px-[72px]">
          {hero.imageUrl ? (
            <Image
              src={hero.imageUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              className="-z-10 object-cover object-[center_30%]"
            />
          ) : (
            <span className="absolute inset-0 -z-10 bg-marine" aria-hidden="true" />
          )}
          <span
            className="absolute inset-0 -z-10 bg-linear-92 from-marine/90 from-0% via-marine/55 via-50% to-marine/10 to-100%"
            aria-hidden="true"
          />
          <div className="hero-entree flex max-w-[600px] flex-col gap-5">
            <span className="text-xs font-medium tracking-[0.32em] text-or uppercase">{hero.eyebrow}</span>
            <h1 className="m-0 text-[clamp(2.1rem,8.5vw,3.25rem)] leading-[1.05] font-bold tracking-[-0.03em] text-creme">
              {hero.titre} <span className="text-or">{hero.titreAccent}</span>
              <span className="text-corail">.</span>
            </h1>
            <p className="m-0 max-w-[46ch] text-[15px] leading-[1.55] text-creme/88 sm:text-base">{hero.description}</p>
            <div className="flex max-w-[560px] gap-2 rounded-full border border-creme/30 bg-creme/14 p-1.5 backdrop-blur-lg sm:p-2">
              <input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') chercher();
                }}
                spellCheck={false}
                placeholder={hero.placeholderRecherche}
                aria-label={hero.boutonRecherche}
                className="min-w-0 flex-1 rounded-full border-none bg-ivoire px-4 py-3 font-mono text-[13px] tracking-[0.03em] text-marine outline-none sm:px-5 sm:py-3.5 sm:text-[15px]"
              />
              <button
                onClick={chercher}
                className="presse inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border-none bg-corail px-5 py-3 font-sans text-[14px] font-medium text-marine hover:bg-or sm:px-7 sm:py-3.5 sm:text-[15px]"
              >
                {hero.boutonRecherche}
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
            {/* La note d'honnêteté (« données de démonstration ») doit rester
                lisible : crème sur marine, pas ciel (4,4:1 à 11 px). */}
            {!reel && <span className="font-mono text-xs text-creme/90">{hero.noteDemo}</span>}
            {/* Annonce du résultat aux lecteurs d'écran : la carte se met à
                jour visuellement sous le hero, sans quoi une recherche reste
                muette pour un utilisateur non-voyant. */}
            <span aria-live="polite" className="sr-only">
              {`${trajetAffiche} — ${etapeContent.jalon} — ETA ${eta}`}
            </span>
          </div>
        </div>
      </header>

      {/* Carte résultat */}
      <section className="relative z-[4] mx-auto -mt-[72px] max-w-[1200px] px-5 sm:px-8">
        <div className="overflow-hidden rounded-[28px] border border-marine/12 bg-ivoire shadow-[0_24px_60px_rgba(18,57,91,0.12)]">
          {/* En-tête du dossier */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-marine/10 px-5 sm:px-10 py-7">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-marine">
                <Image src="/logos/marque-sur-marine.svg" alt="" width={32} height={32} unoptimized />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-xl tracking-[0.05em]">
                  {reel ? reel.reference : affiche.toUpperCase() || numeroDefaut}
                </span>
                <span className="text-sm text-encre-douce">{trajetAffiche}</span>
              </div>
            </div>
            <span
              className={`rounded-full px-4 py-2 text-xs font-medium tracking-[0.08em] uppercase ${BADGE_CLASSES[etape]}`}
            >
              {etapeContent.statut}
            </span>
          </div>

          {/* Visuel de statut & informations — le globe + télémétrie GPS
              n'apparaît qu'« en mer » ; sinon, image représentative + statut. */}
          <div className="grid items-center gap-7 bg-marine-fonce px-5 py-7 sm:gap-11 sm:px-11 sm:py-9 md:grid-cols-[280px_1fr]">
            {enMer ? (
              <Globe markers={globeMarkers} arcs={globeArcs} className="max-w-[280px]" />
            ) : (
              <VisuelEtape
                imageUrl={etapeContent.imageUrl}
                iconePath={ICONES_JALONS[etape]!}
                statut={etapeContent.statut}
                livre={etape === 4}
              />
            )}
            <div className="flex min-w-0 flex-col gap-4 text-creme">
              <div className="flex items-center gap-2.5">
                <span
                  className="h-[9px] w-[9px] rounded-full bg-corail"
                  style={{ animation: 'marker-pulse 1.6s ease-out infinite' }}
                  aria-hidden="true"
                />
                <span className="text-[11px] font-medium tracking-[0.32em] text-or uppercase">
                  {etapeContent.position}
                </span>
              </div>
              {enMer ? (
                <>
                  <div className="flex flex-wrap gap-8">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[11px] text-ciel">{resultat.libelleLatitude}</span>
                      <span className="font-mono text-[22px] leading-none sm:text-[28px]">{dms(lat, 'N', 'S')}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[11px] text-ciel">{resultat.libelleLongitude}</span>
                      <span className="font-mono text-[22px] leading-none sm:text-[28px]">{dms(lon, 'E', 'W')}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <span className="rounded-full border border-creme/25 px-3.5 py-[7px] font-mono text-xs">{chipA}</span>
                    <span className="rounded-full border border-creme/25 px-3.5 py-[7px] font-mono text-xs">{chipB}</span>
                    <span className="rounded-full border border-creme/25 px-3.5 py-[7px] font-mono text-xs text-or">
                      {resultat.libelleSignal} {horloge ?? '--:--:--'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap gap-8">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[11px] text-ciel">
                        {resultat.carteProgression.toUpperCase()}
                      </span>
                      <span className="font-mono text-[22px] leading-none sm:text-[28px] text-corail">{progression}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[11px] text-ciel">{resultat.carteEta.toUpperCase()}</span>
                      <span className="font-mono text-[20px] leading-none">{eta}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {chipA && (
                      <span className="rounded-full border border-creme/25 px-3.5 py-[7px] font-mono text-xs">
                        {chipA}
                      </span>
                    )}
                    {chipB && (
                      <span className="rounded-full border border-creme/25 px-3.5 py-[7px] font-mono text-xs">
                        {chipB}
                      </span>
                    )}
                  </div>
                </>
              )}
              <span className="font-mono text-xs text-creme/65">{trajetMono}</span>
            </div>
          </div>

          {/* Jalons */}
          <div className="grid grid-cols-2 gap-y-6 px-5 sm:px-10 pt-2 pb-8 sm:grid-cols-5">
            {etapes.map((j, i) => {
              const fait = i < etape;
              const actif = i === etape;
              return (
                <div key={j.jalon} className="relative flex flex-col items-center gap-2.5 px-2 text-center">
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${
                      actif
                        ? 'bg-corail text-marine'
                        : fait
                          ? 'bg-ciel text-marine-abysse'
                          : 'border-[1.5px] border-marine/25 text-encre-douce'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={ICONES_JALONS[i]} />
                    </svg>
                  </span>
                  <span
                    className={`text-[13px] leading-[1.3] ${
                      actif ? 'font-bold text-marine' : fait ? 'font-medium text-marine' : 'text-encre-douce'
                    }`}
                  >
                    {j.jalon}
                  </span>
                  <span className="font-mono text-[11px] text-encre-douce">
                    {!reel && i <= etape ? DATES_DEMO[i] : '—'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Cartes détail */}
          <div className="grid grid-cols-1 gap-4 px-5 sm:px-10 pb-9 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5 rounded-2xl border border-marine/12 bg-creme px-5 py-[18px]">
              <span className="text-[10px] font-medium tracking-[0.32em] text-encre-douce uppercase">
                {resultat.cartePosition}
              </span>
              <span className="font-mono text-sm leading-normal">{positionCarte}</span>
            </div>
            <div className="flex flex-col gap-1.5 rounded-2xl border border-marine/12 bg-creme px-5 py-[18px]">
              <span className="text-[10px] font-medium tracking-[0.32em] text-encre-douce uppercase">
                {resultat.carteNavire}
              </span>
              <span className="font-mono text-sm leading-normal">{navireCarte}</span>
            </div>
            <div className="flex flex-col gap-1.5 rounded-2xl border border-marine/12 bg-creme px-5 py-[18px]">
              <span className="text-[10px] font-medium tracking-[0.32em] text-encre-douce uppercase">
                {resultat.carteProgression}
              </span>
              <span className="font-mono text-[22px] text-corail-texte">{progression}</span>
            </div>
            <div className="flex flex-col gap-1.5 rounded-2xl bg-marine px-5 py-[18px] text-creme">
              <span className="text-[10px] font-medium tracking-[0.32em] text-or uppercase">{resultat.carteEta}</span>
              <span className="font-mono text-sm leading-normal">{eta}</span>
            </div>
          </div>
        </div>
        <p className="mx-1 mt-4 mb-0 text-[13px] text-encre-douce">
          {resultat.noteContact}{' '}
          <Link href={contactHref} className="font-medium underline">
            {resultat.noteContactLien}
          </Link>
        </p>
      </section>
    </>
  );
}
