import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { defaultLocale, isLocale, type Locale } from '@hgwf/shared';
import { getPageMentions } from '@/sanity/queries';

export { generateStaticParams } from '@/i18n/staticParams';

// Contenu par défaut : informations légales du site actuel (mentions-legales).
const DEFAUT = {
  eyebrow: 'Informations légales',
  titrePage: 'Mentions légales.',
  sections: [
    {
      titre: 'Éditeur du site',
      corps: 'HGWF SOLUTIONS TRANSPORTS LOGISTIQUES\n29 avenue Nollet, 93420 Villepinte',
    },
    {
      titre: 'Immatriculation',
      corps: '940 048 051 R.C.S. Bobigny\nNuméro de TVA : FR18940048051',
    },
    {
      titre: 'Direction',
      corps: 'Dirigeante : Marie Bagassien',
    },
    {
      titre: 'Contact',
      corps: 'contact@hgwf-cargo.fr\n+33 6 27 05 69 34',
    },
  ],
  seoTitre: 'Mentions légales — HGWF Cargo',
  seoDescription: 'Mentions légales du site HGWF Cargo — HGWF Solutions Transports Logistiques.',
};

function resolveLocale(locale: string): Locale {
  return isLocale(locale) ? locale : defaultLocale;
}

async function getContenu(locale: Locale) {
  const data = await getPageMentions(locale);
  return {
    eyebrow: data?.eyebrow ?? DEFAUT.eyebrow,
    titrePage: data?.titrePage ?? DEFAUT.titrePage,
    sections: data?.sections?.length
      ? data.sections.map((s) => ({ titre: s.titre ?? '', corps: s.corps ?? '' }))
      : DEFAUT.sections,
    seo: {
      titre: data?.seoTitre ?? DEFAUT.seoTitre,
      description: data?.seoDescription ?? DEFAUT.seoDescription,
    },
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { seo } = await getContenu(resolveLocale(locale));
  return { title: seo.titre, description: seo.description };
}

export default async function MentionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { eyebrow, titrePage, sections } = await getContenu(resolveLocale(locale));

  return (
    <main>
      <header className="bg-marine">
        <div className="hero-entree mx-auto flex max-w-[860px] flex-col gap-4 px-5 sm:px-8 pt-32 sm:pt-[150px] pb-16 text-creme">
          <span className="text-xs font-medium tracking-[0.32em] text-or uppercase">{eyebrow}</span>
          <h1 className="m-0 text-4xl leading-[1.05] font-bold tracking-[-0.03em] uppercase md:text-5xl">
            {titrePage}
          </h1>
        </div>
      </header>
      <section className="mx-auto max-w-[860px] px-5 sm:px-8 pt-14 pb-22">
        <div className="flex flex-col gap-8">
          {sections.map((s) => (
            <div key={s.titre} className="flex flex-col gap-2 border-t border-marine/14 pt-6 first:border-t-0 first:pt-0">
              <h2 className="m-0 text-xs font-medium tracking-[0.32em] text-encre-douce uppercase">{s.titre}</h2>
              <div className="flex flex-col gap-1 font-mono text-sm leading-relaxed">
                {s.corps.split('\n').map((ligne, i) => (
                  <span key={i}>{ligne}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
