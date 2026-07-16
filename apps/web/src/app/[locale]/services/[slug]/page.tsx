import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isLocale } from '@hgwf/shared';
import { getServiceSlugs, getService } from '@/sanity/queries';
import { routing } from '@/i18n/routing';

type PageParams = { locale: string; slug: string };

export async function generateStaticParams(): Promise<PageParams[]> {
  const params: PageParams[] = [];
  for (const locale of routing.locales) {
    const slugs = await getServiceSlugs(locale);
    for (const slug of slugs) params.push({ locale, slug });
  }
  return params;
}

export const dynamicParams = false;

export default async function ServicePage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const service = await getService(locale, slug);
  if (!service) notFound();
  return (
    <main className="mx-auto max-w-[1200px] px-8 pt-32 pb-16">
      <h1>{service.titre}</h1>
      {service.resume ? <p>{service.resume}</p> : null}
    </main>
  );
}
