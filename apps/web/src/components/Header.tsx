import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { getNavigation, getSiteSettings } from '@/sanity/queries';
import { MobileNav } from './MobileNav';

const LIENS_DEFAUT = [
  { fr: 'Destinations', en: 'Destinations', href: '/#zones' },
  { fr: 'Services', en: 'Services', href: '/#services' },
  { fr: 'Déménagement', en: 'Removals', href: '/#demenagement' },
  { fr: 'Suivi', en: 'Tracking', href: '/suivi' },
  { fr: 'Nous contacter', en: 'Contact us', href: '/contact' },
];

const CTA_DEFAUT = { fr: 'Demander un devis', en: 'Request a quote', href: '/devis' };

export async function Header({ locale }: { locale: string }) {
  const [nav, settings] = await Promise.all([getNavigation(), getSiteSettings()]);
  const en = locale === 'en';

  const liens =
    nav?.liens?.length
      ? nav.liens.map((l) => ({
          libelle: (en ? l.libelleEn : l.libelleFr) ?? l.libelleFr ?? '',
          href: l.href ?? '/',
        }))
      : LIENS_DEFAUT.map((l) => ({ libelle: en ? l.en : l.fr, href: l.href }));

  const cta = {
    libelle:
      (en ? nav?.cta?.libelleEn : nav?.cta?.libelleFr) ??
      nav?.cta?.libelleFr ??
      (en ? CTA_DEFAUT.en : CTA_DEFAUT.fr),
    href: nav?.cta?.href ?? CTA_DEFAUT.href,
  };

  const logoUrl = settings?.logoEmblemeUrl ?? '/logos/embleme.svg';
  const nom = settings?.nomCommercial ?? 'HGWF Cargo';

  return (
    <header
      className="fixed inset-x-0 top-0 z-60 bg-marine/80 backdrop-blur-md"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <nav
        aria-label="Navigation principale"
        className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-5 py-2.5 sm:gap-6 sm:px-8 sm:py-3"
      >
        <Link href="/" className="flex shrink-0 items-center gap-2.5 sm:gap-3">
          <Image
            src={logoUrl}
            alt={nom}
            width={42}
            height={42}
            unoptimized
            className="h-9 w-9 rounded-full shadow-[0_0_0_2px_rgba(251,244,230,0.35)] sm:h-[42px] sm:w-[42px]"
          />
          <span className="flex flex-col">
            <span className="text-base leading-none font-bold text-creme sm:text-lg">HGWF</span>
            <span className="text-[7px] font-medium tracking-[0.42em] text-or uppercase sm:text-[8px]">
              Cargo
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-6 text-sm font-medium md:flex">
          {liens.map((l) => (
            <Link key={l.href + l.libelle} href={l.href} className="text-creme transition hover:text-or">
              {l.libelle}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href={cta.href}
            className="presse rounded-full bg-corail px-4 py-2.5 text-[13px] font-medium whitespace-nowrap text-creme hover:bg-corail-fonce sm:px-6 sm:text-sm"
          >
            {cta.libelle}
          </Link>
          <MobileNav liens={liens} cta={cta} logoUrl={logoUrl} nom={nom} />
        </div>
      </nav>
    </header>
  );
}
