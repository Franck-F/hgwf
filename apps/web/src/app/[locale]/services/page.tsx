import { setRequestLocale } from 'next-intl/server';

export { generateStaticParams } from '@/i18n/staticParams';

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="mx-auto max-w-[1200px] px-8 pt-32 pb-16">
      <h1>Services</h1>
      <p>La liste des services sera disponible prochainement.</p>
    </main>
  );
}
