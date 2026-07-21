import { TexteRiche } from './TexteRiche';
import type { Bloc } from './portable';

export type SectionLegale = { titre: string; ancre: string; corps: Bloc[] };

export type ContenuLegal = {
  eyebrow: string;
  titrePage: string;
  chapo: string;
  dateMaj: string;
  sections: SectionLegale[];
};

function formaterDate(iso: string, locale: string): string {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

export function PageLegale({ contenu, locale }: { contenu: ContenuLegal; locale: string }) {
  const { eyebrow, titrePage, chapo, dateMaj, sections } = contenu;
  const sommaire = sections.length >= 4;
  const dateLisible = formaterDate(dateMaj, locale);

  return (
    <main>
      <header className="bg-marine">
        <div className="hero-entree mx-auto flex max-w-[860px] flex-col gap-4 px-5 pt-32 pb-16 sm:px-8 sm:pt-[150px] text-creme">
          <span className="text-xs font-medium tracking-[0.32em] text-or uppercase">{eyebrow}</span>
          <h1 className="m-0 text-4xl leading-[1.05] font-bold tracking-[-0.03em] uppercase md:text-5xl">
            {titrePage}
          </h1>
          {chapo && <p className="m-0 max-w-[62ch] text-[15px] leading-[1.6] text-creme/85">{chapo}</p>}
          {dateLisible && (
            <span className="font-mono text-xs text-creme/60">
              {locale === 'en' ? 'Last updated' : 'Dernière mise à jour'} : {dateLisible}
            </span>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-[860px] px-5 pt-14 pb-22 sm:px-8">
        {sommaire && (
          <nav aria-label={locale === 'en' ? 'Contents' : 'Sommaire'} className="mb-12 rounded-[18px] border border-marine/12 bg-creme p-6">
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {sections.map((s) => (
                <li key={s.ancre}>
                  <a href={`#${s.ancre}`} className="text-sm font-medium text-marine underline-offset-2 hover:underline">
                    {s.titre}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="flex flex-col gap-10">
          {sections.map((s) => (
            <section key={s.ancre} id={s.ancre} className="flex scroll-mt-28 flex-col gap-3">
              <h2 className="m-0 text-xl font-bold tracking-[-0.02em] text-marine md:text-2xl">{s.titre}</h2>
              <TexteRiche blocs={s.corps} />
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
