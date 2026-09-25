import { Link } from '@/i18n/navigation';
import type { QuestionReponse } from '@/content/faqCiblees';

// Bloc « questions fréquentes » propre à une page (devis, suivi, services…).
// Deux rôles : répondre aux questions que se pose le visiteur à cet endroit
// précis, et donner aux moteurs (Google, IA génératives) un contenu
// question-réponse balisé en FAQPage. Les questions sont des <h3> sous un <h2>,
// ce qui structure aussi la hiérarchie des titres de la page.
export function FaqCiblee({
  titre,
  items,
  lienFaq,
  className = '',
}: {
  titre: string;
  items: QuestionReponse[];
  lienFaq?: string;
  className?: string;
}) {
  // `<` neutralisé : aucun `</script>` ne peut sortir du bloc JSON-LD.
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.reponse },
    })),
  }).replaceAll('<', '\\u003c');

  return (
    <section className={`mx-auto max-w-[860px] px-5 sm:px-8 ${className}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <h2 className="revele m-0 text-2xl font-bold tracking-[-0.03em] md:text-[32px]">{titre}</h2>
      <div className="revele-cascade mt-6 flex flex-col">
        {items.map((item) => (
          <details key={item.question} className="group border-t border-marine/14 px-1 py-[18px] last:border-b">
            <summary className="flex cursor-pointer list-none justify-between gap-4 transition-colors duration-200 hover:text-corail-texte [&::-webkit-details-marker]:hidden">
              <h3 className="m-0 text-base font-bold">{item.question}</h3>
              <span className="font-normal text-corail-texte transition group-open:rotate-45" aria-hidden="true">
                +
              </span>
            </summary>
            <p className="mt-3 mb-0 text-sm leading-[1.6] text-encre-douce">{item.reponse}</p>
          </details>
        ))}
      </div>
      {lienFaq ? (
        <p className="mt-5 mb-0 text-sm">
          <Link href="/faq" className="font-medium text-corail-texte underline">
            {lienFaq}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
