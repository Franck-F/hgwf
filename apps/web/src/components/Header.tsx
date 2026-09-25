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

  // Lockup horizontal de la charte (version fond sombre) — sur le header marine.
  const logoUrl = '/logos/hgwf-horizontal-sombre.webp';
  const nom = settings?.nomCommercial ?? 'HGWF Cargo';

  return (
    <header
      className="entete fixed inset-x-0 top-0 z-60"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <nav
        aria-label="Navigation principale"
        className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-5 py-2.5 sm:gap-6 sm:px-8 sm:py-3"
      >
        <Link href="/" className="flex shrink-0 items-center" aria-label={nom}>
          <Image
            src={logoUrl}
            alt={nom}
            width={420}
            height={130}
            priority
            unoptimized
            className="h-9 w-auto sm:h-11"
          />
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
            className="presse inline-flex min-h-11 items-center justify-center rounded-full bg-corail px-4 py-2.5 text-[13px] font-medium whitespace-nowrap text-marine hover:bg-or sm:px-6 sm:text-sm"
          >
            {cta.libelle}
          </Link>
          <MobileNav liens={liens} cta={cta} logoUrl={logoUrl} nom={nom} />
        </div>
      </nav>
    </header>
  );
}
