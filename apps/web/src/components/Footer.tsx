import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { getArticles, getFooter, getSiteSettings } from '@/sanity/queries';
import { TEXTES_BLOG } from '@/blog/outils';
import { nettoyerInvisibles } from './nettoyerInvisibles';

const COLONNES_DEFAUT = [
  {
    fr: 'Navigation',
    en: 'Navigation',
    liens: [
      { fr: 'Destinations', en: 'Destinations', href: '/#zones' },
      { fr: 'Demander un devis', en: 'Request a quote', href: '/devis' },
      { fr: "Suivi d'envoi", en: 'Shipment tracking', href: '/suivi' },
    ],
  },
  {
    fr: 'Aide',
    en: 'Help',
    liens: [
      { fr: 'Questions fréquentes (FAQ)', en: 'FAQ', href: '/faq' },
      { fr: 'Nous contacter', en: 'Contact us', href: '/contact' },
    ],
  },
];

const LIGNE_LEGALE_DEFAUT =
  'HGWF CARGO · AVENUE FAIDHERBE, 93110 ROSNY-SOUS-BOIS · 940 048 051 R.C.S. BOBIGNY · TVA FR18940048051';

const LIENS_LEGAUX_DEFAUT = [
  { fr: 'Mentions légales', en: 'Legal notice', href: '/mentions-legales' },
  { fr: 'Politique de confidentialité', en: 'Privacy policy', href: '/confidentialite' },
  { fr: 'CGV', en: 'Terms of sale', href: '/cgv' },
];

function IconeFacebook() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7h2.4l.36-2.8H13.5V9.4c0-.81.22-1.36 1.38-1.36h1.48V5.55c-.26-.03-1.14-.11-2.16-.11-2.14 0-3.6 1.3-3.6 3.7v2.06H8.2V14h2.4v7h2.9z" />
    </svg>
  );
}

function IconeInstagram() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconeTikTok() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.77.12V9.77a5.8 5.8 0 0 0-.77-.05 5.66 5.66 0 1 0 5.66 5.66V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.28 4.28 0 0 1-3.22-1.48z" />
    </svg>
  );
}

export async function Footer({ locale }: { locale: string }) {
  const en = locale === 'en';
  const [footer, settings, articles] = await Promise.all([
    getFooter(),
    getSiteSettings(),
    getArticles(en ? 'en' : 'fr').catch(() => []),
  ]);

  const baseline =
    (en ? footer?.texteEn : footer?.texteFr) ??
    footer?.texteFr ??
    settings?.baseline ??
    (en ? 'Freight transport all over the world.' : 'Transport de marchandises dans le monde entier.');

  const colonnesBrutes = footer?.colonnes?.length
    ? footer.colonnes.map((c) => ({
        titre: (en ? c.titreEn : c.titreFr) ?? c.titreFr ?? '',
        liens: (c.liens ?? []).map((l) => ({
          libelle: (en ? l.libelleEn : l.libelleFr) ?? l.libelleFr ?? '',
          href: l.href ?? '/',
        })),
      }))
    : COLONNES_DEFAUT.map((c) => ({
        titre: en ? c.en : c.fr,
        liens: c.liens.map((l) => ({ libelle: en ? l.en : l.fr, href: l.href })),
      }));

  // Lien vers le blog, ajouté à la dernière colonne dès qu'un article existe
  // dans cette langue (pas de lien vers une page vide), sauf si l'équipe l'a
  // déjà mis dans le pied de page depuis le Studio.
  const lienBlog = { libelle: TEXTES_BLOG[en ? 'en' : 'fr'].lienPied, href: '/blog' };
  const dejaPresent = colonnesBrutes.some((c) => c.liens.some((l) => l.href.replace(/\/$/, '') === '/blog'));
  const colonnes =
    articles.length > 0 && !dejaPresent && colonnesBrutes.length > 0
      ? colonnesBrutes.map((c, i) => (i === colonnesBrutes.length - 1 ? { ...c, liens: [...c.liens, lienBlog] } : c))
      : colonnesBrutes;

  const ligneLegale = nettoyerInvisibles(footer?.ligneLegale ?? LIGNE_LEGALE_DEFAUT);
  const copyright =
    (en ? footer?.copyrightEn : footer?.copyrightFr) ??
    footer?.copyrightFr ??
    (en ? '© 2026 HGWF Cargo. All rights reserved.' : '© 2026 HGWF Cargo. Tous droits réservés.');

  const liensLegaux = footer?.liensLegaux?.length
    ? footer.liensLegaux.map((l) => ({
        libelle: (en ? l.libelleEn : l.libelleFr) ?? l.libelleFr ?? '',
        href: l.href ?? '/',
      }))
    : footer?.mentionsHref
      ? [
          {
            libelle: (en ? footer.mentionsLibelleEn : footer.mentionsLibelleFr) ?? footer.mentionsLibelleFr ?? '',
            href: footer.mentionsHref,
          },
        ]
      : LIENS_LEGAUX_DEFAUT.map((l) => ({ libelle: en ? l.en : l.fr, href: l.href }));

  const email = settings?.email ?? 'contact@hgwf-cargo.fr';
  const telephone = settings?.telephones?.[0]?.numero ?? '+33 6 27 05 69 34';
  // Ligne fixe de l'agence, affichée en plus du mobile.
  const telephoneFixe = '09 62 03 80 13';
  const reseaux = settings?.reseaux;
  const logoUrl = '/logos/hgwf-monochrome-blanc.webp';

  const sociaux = [
    { nom: 'Facebook', href: reseaux?.facebook ?? '#', icone: <IconeFacebook /> },
    { nom: 'Instagram', href: reseaux?.instagram ?? '#', icone: <IconeInstagram /> },
    { nom: 'TikTok', href: reseaux?.tiktok ?? '#', icone: <IconeTikTok /> },
  ];

  return (
    <footer className="bg-marine text-creme">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-9 px-5 sm:px-8 pt-14 pb-10 md:grid-cols-[1.3fr_1fr_0.9fr_1fr]">
        <div className="flex flex-col gap-3.5">
          <Image
            src={logoUrl}
            alt="HGWF Cargo"
            width={420}
            height={130}
            unoptimized
            className="h-14 w-auto self-start"
          />
          <p className="m-0 max-w-[38ch] text-[13px] text-creme/75">{baseline}</p>
          <span className="whitespace-pre-line font-mono text-[11px] leading-7 text-creme/55">{ligneLegale}</span>
        </div>
        {colonnes.map((c) => (
          <div key={c.titre} className="flex flex-col gap-2.5 text-sm">
            <span className="text-[11px] font-medium tracking-[0.32em] text-ciel uppercase">
              {c.titre}
            </span>
            {c.liens.map((l) => (
              <Link key={l.href + l.libelle} href={l.href} className="text-creme transition hover:text-or">
                {l.libelle}
              </Link>
            ))}
          </div>
        ))}
        <div className="flex flex-col gap-3.5 text-sm">
          <span className="text-[11px] font-medium tracking-[0.32em] text-ciel uppercase">
            {en ? 'Social media' : 'Réseaux sociaux'}
          </span>
          <div className="flex gap-3">
            {sociaux.map((s) => (
              <a
                key={s.nom}
                href={s.href}
                aria-label={s.nom}
                title={s.nom}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-creme/30 text-creme transition hover:bg-corail hover:text-marine"
              >
                {s.icone}
              </a>
            ))}
          </div>
          <span className="font-mono text-xs text-creme/70">
            {email}
            <br />
            {telephone}
            <br />
            {telephoneFixe}
          </span>
        </div>
      </div>
      <div className="border-t border-creme/15">
        <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-4 px-5 sm:px-8 py-4.5 text-xs text-creme/55">
          <span>{copyright}</span>
          <nav aria-label={en ? 'Legal links' : 'Liens légaux'}>
            <ul className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0">
              {liensLegaux.map((l) => (
                <li key={l.href + l.libelle}>
                  <Link href={l.href} className="text-creme/55 transition hover:text-or">
                    {l.libelle}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
