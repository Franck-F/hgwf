import { groq } from 'next-sanity';
import { sanityClient } from './client';
import type { Locale } from '@hgwf/shared';

export type ServiceSummary = { slug: string; titre: string; resume: string | null };

const SERVICE_SLUGS = groq`*[_type == "service" && language == $locale && defined(slug.current)].slug.current`;
const SERVICE_BY_SLUG = groq`*[_type == "service" && language == $locale && slug.current == $slug][0]{
  "slug": slug.current, titre, resume
}`;

export async function getServiceSlugs(locale: Locale): Promise<string[]> {
  if (!sanityClient) return [];
  return sanityClient.fetch<string[]>(SERVICE_SLUGS, { locale });
}

export async function getService(locale: Locale, slug: string): Promise<ServiceSummary | null> {
  if (!sanityClient) return null;
  return sanityClient.fetch<ServiceSummary | null>(SERVICE_BY_SLUG, { locale, slug });
}
