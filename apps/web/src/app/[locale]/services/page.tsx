import { setRequestLocale } from 'next-intl/server';

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main>
      <h1>Services</h1>
      <p>La liste des services sera disponible prochainement.</p>
    </main>
  );
}
