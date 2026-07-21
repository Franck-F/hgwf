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

// ── Navigation / footer / paramètres du site ────────────────────────────────

export type LienNav = { libelleFr?: string | null; libelleEn?: string | null; href?: string | null };

export type NavigationData = {
  liens?: LienNav[] | null;
  cta?: LienNav | null;
};

export type FooterColonne = {
  titreFr?: string | null;
  titreEn?: string | null;
  liens?: LienNav[] | null;
};

export type FooterData = {
  texteFr?: string | null;
  texteEn?: string | null;
  ligneLegale?: string | null;
  colonnes?: FooterColonne[] | null;
  liensLegaux?: LienNav[] | null;
  copyrightFr?: string | null;
  copyrightEn?: string | null;
  mentionsLibelleFr?: string | null;
  mentionsLibelleEn?: string | null;
  mentionsHref?: string | null;
};

export type SiteSettingsData = {
  raisonSociale?: string | null;
  nomCommercial?: string | null;
  baseline?: string | null;
  email?: string | null;
  telephones?: { contact?: string | null; numero?: string | null }[] | null;
  adresseSiege?: string | null;
  reseaux?: { facebook?: string | null; instagram?: string | null; tiktok?: string | null } | null;
  logoEmblemeUrl?: string | null;
  logoFooterUrl?: string | null;
};

const NAVIGATION = groq`*[_type == "navigation"][0]{
  liens[]{libelleFr, libelleEn, href},
  cta{libelleFr, libelleEn, href}
}`;

const FOOTER = groq`*[_type == "footer"][0]{
  texteFr, texteEn, ligneLegale,
  colonnes[]{titreFr, titreEn, liens[]{libelleFr, libelleEn, href}},
  liensLegaux[]{libelleFr, libelleEn, href},
  copyrightFr, copyrightEn, mentionsLibelleFr, mentionsLibelleEn, mentionsHref
}`;

const SITE_SETTINGS = groq`*[_type == "siteSettings"][0]{
  raisonSociale, nomCommercial, baseline, email,
  telephones[]{contact, numero},
  adresseSiege,
  reseaux{facebook, instagram, tiktok},
  "logoEmblemeUrl": logoEmbleme.asset->url,
  "logoFooterUrl": logoFooter.asset->url
}`;

export async function getNavigation(): Promise<NavigationData | null> {
  if (!sanityClient) return null;
  return sanityClient.fetch<NavigationData | null>(NAVIGATION);
}

export async function getFooter(): Promise<FooterData | null> {
  if (!sanityClient) return null;
  return sanityClient.fetch<FooterData | null>(FOOTER);
}

export async function getSiteSettings(): Promise<SiteSettingsData | null> {
  if (!sanityClient) return null;
  return sanityClient.fetch<SiteSettingsData | null>(SITE_SETTINGS);
}

// ── Page Accueil ─────────────────────────────────────────────────────────────

export type PageAccueilData = {
  hero?: {
    titre?: string | null;
    titreAccent?: string | null;
    description?: string | null;
    boutonPrincipal?: string | null;
    boutonPrincipalLien?: string | null;
    boutonSecondaire?: string | null;
    boutonSecondaireLien?: string | null;
    badge?: string | null;
    imageUrl?: string | null;
  } | null;
  services?: { titre?: string | null; texte?: string | null; lien?: string | null; imageUrl?: string | null }[] | null;
  promesse?: { titre?: string | null; titreAccent?: string | null; texte?: string | null } | null;
  zones?: {
    titre?: string | null;
    titreAccent?: string | null;
    badge?: string | null;
    bouton?: string | null;
    boutonLien?: string | null;
    imageUrl?: string | null;
    cartes?: { titre?: string | null; texte?: string | null }[] | null;
  } | null;
  demenagement?: {
    eyebrow?: string | null;
    titre?: string | null;
    titreAccent?: string | null;
    titreFin?: string | null;
    texte?: string | null;
    points?: string[] | null;
    bouton?: string | null;
    boutonLien?: string | null;
    imageUrl?: string | null;
    badgeValeur?: string | null;
    badgeTexte?: string | null;
  } | null;
  delais?: {
    titre?: string | null;
    titreAccent?: string | null;
    texte?: string | null;
    lienFaq?: string | null;
    barres?: { destination?: string | null; delai?: string | null; pourcentage?: number | null; couleur?: string | null }[] | null;
  } | null;
  conteneurs?: {
    eyebrow?: string | null;
    titre?: string | null;
    titreAccent?: string | null;
    texte?: string | null;
    chips?: string[] | null;
    bouton?: string | null;
    boutonLien?: string | null;
    imageUrl?: string | null;
  } | null;
  faqCourte?: {
    titre?: string | null;
    titreAccent?: string | null;
    texte?: string | null;
    lienTexte?: string | null;
    bouton?: string | null;
    items?: { question?: string | null; reponse?: string | null }[] | null;
  } | null;
  ctaSuivi?: {
    eyebrow?: string | null;
    titre?: string | null;
    titreAccent?: string | null;
    texte?: string | null;
    boutonPrincipal?: string | null;
    boutonSecondaire?: string | null;
    imageUrl?: string | null;
  } | null;
  seoTitre?: string | null;
  seoDescription?: string | null;
};

const PAGE_ACCUEIL = groq`*[_type == "pageAccueil" && language == $locale][0]{
  hero{titre, titreAccent, description, boutonPrincipal, boutonPrincipalLien, boutonSecondaire, boutonSecondaireLien, badge, "imageUrl": image.asset->url},
  services[]{titre, texte, lien, "imageUrl": image.asset->url},
  promesse{titre, titreAccent, texte},
  zones{titre, titreAccent, badge, bouton, boutonLien, "imageUrl": image.asset->url, cartes[]{titre, texte}},
  demenagement{eyebrow, titre, titreAccent, titreFin, texte, points, bouton, boutonLien, "imageUrl": image.asset->url, badgeValeur, badgeTexte},
  delais{titre, titreAccent, texte, lienFaq, barres[]{destination, delai, pourcentage, couleur}},
  conteneurs{eyebrow, titre, titreAccent, texte, chips, bouton, boutonLien, "imageUrl": image.asset->url},
  faqCourte{titre, titreAccent, texte, lienTexte, bouton, items[]{question, reponse}},
  ctaSuivi{eyebrow, titre, titreAccent, texte, boutonPrincipal, boutonSecondaire, "imageUrl": image.asset->url},
  seoTitre, seoDescription
}`;

export async function getPageAccueil(locale: Locale): Promise<PageAccueilData | null> {
  if (!sanityClient) return null;
  return sanityClient.fetch<PageAccueilData | null>(PAGE_ACCUEIL, { locale });
}

// ── Page Mentions légales ────────────────────────────────────────────────────

export type PageMentionsData = {
  eyebrow?: string | null;
  titrePage?: string | null;
  sections?: { titre?: string | null; corps?: string | null }[] | null;
  seoTitre?: string | null;
  seoDescription?: string | null;
};

const PAGE_MENTIONS = groq`*[_type == "pageMentions" && language == $locale][0]{
  eyebrow, titrePage,
  sections[]{titre, corps},
  seoTitre, seoDescription
}`;

export async function getPageMentions(locale: Locale): Promise<PageMentionsData | null> {
  if (!sanityClient) return null;
  return sanityClient.fetch<PageMentionsData | null>(PAGE_MENTIONS, { locale });
}

// ── Pages légales ────────────────────────────────────────────────────────────────

export type PageLegaleData = {
  eyebrow?: string | null;
  titrePage?: string | null;
  chapo?: string | null;
  dateMaj?: string | null;
  sections?: { titre?: string | null; ancre?: string | null; corps?: unknown[] | null }[] | null;
  seoTitre?: string | null;
  seoDescription?: string | null;
};

const PAGE_LEGALE = groq`*[_type == "pageLegale" && slug.current == $slug && language == $locale][0]{
  eyebrow, titrePage, chapo, dateMaj,
  sections[]{titre, "ancre": ancre.current, corps},
  seoTitre, seoDescription
}`;

export async function getPageLegale(locale: Locale, slug: string): Promise<PageLegaleData | null> {
  if (!sanityClient) return null;
  return sanityClient.fetch<PageLegaleData | null>(PAGE_LEGALE, { locale, slug });
}

// ── Page Devis ───────────────────────────────────────────────────────────────

export type PageDevisData = {
  hero?: {
    eyebrow?: string | null;
    titre?: string | null;
    titreAccent?: string | null;
    description?: string | null;
    imageUrl?: string | null;
  } | null;
  etapeLabels?: string[] | null;
  etapeType?: { titre?: string | null } | null;
  etapeDestination?: {
    titre?: string | null;
    libelleDestination?: string | null;
    libelleDepart?: string | null;
    libelleDelai?: string | null;
  } | null;
  etapeVolume?: { titre?: string | null; texte?: string | null; boutonAjouter?: string | null } | null;
  etapeCoordonnees?: {
    titre?: string | null;
    placeholderNom?: string | null;
    placeholderEmail?: string | null;
    placeholderTel?: string | null;
    placeholderMessage?: string | null;
  } | null;
  recap?: {
    titre?: string | null;
    libelleType?: string | null;
    libelleDestination?: string | null;
    libelleDepart?: string | null;
    libelleVolume?: string | null;
  } | null;
  confirmation?: {
    titre?: string | null;
    texte?: string | null;
    boutonContact?: string | null;
    boutonAccueil?: string | null;
  } | null;
  boutons?: { precedent?: string | null; suivant?: string | null; envoyer?: string | null } | null;
  typesEnvoi?: { label?: string | null; description?: string | null }[] | null;
  destinations?: { nom?: string | null; delai?: string | null }[] | null;
  portsDepart?: string[] | null;
  imagesEtapesUrls?: (string | null)[] | null;
  reassurance?: { valeur?: string | null; titre?: string | null; texte?: string | null }[] | null;
  seoTitre?: string | null;
  seoDescription?: string | null;
};

const PAGE_DEVIS = groq`*[_type == "pageDevis" && language == $locale][0]{
  hero{eyebrow, titre, titreAccent, description, "imageUrl": image.asset->url},
  etapeLabels,
  etapeType{titre},
  etapeDestination{titre, libelleDestination, libelleDepart, libelleDelai},
  etapeVolume{titre, texte, boutonAjouter},
  etapeCoordonnees{titre, placeholderNom, placeholderEmail, placeholderTel, placeholderMessage},
  recap{titre, libelleType, libelleDestination, libelleDepart, libelleVolume},
  confirmation{titre, texte, boutonContact, boutonAccueil},
  boutons{precedent, suivant, envoyer},
  typesEnvoi[]{label, description},
  destinations[]{nom, delai},
  portsDepart,
  "imagesEtapesUrls": imagesEtapes[].asset->url,
  reassurance[]{valeur, titre, texte},
  seoTitre, seoDescription
}`;

export async function getPageDevis(locale: Locale): Promise<PageDevisData | null> {
  if (!sanityClient) return null;
  return sanityClient.fetch<PageDevisData | null>(PAGE_DEVIS, { locale });
}

// ── Page FAQ ─────────────────────────────────────────────────────────────────

export type PortableBlock = {
  _type: string;
  style?: string | null;
  listItem?: string | null;
  children?: { text?: string | null }[] | null;
};

export type FaqItemData = {
  question: string;
  reponse?: PortableBlock[] | null;
  categorie?: string | null;
};

export type PageFaqData = {
  hero?: {
    eyebrow?: string | null;
    titre?: string | null;
    description?: string | null;
    lienContact?: string | null;
    imageUrl?: string | null;
  } | null;
  categories?: { cle?: string | null; titre?: string | null }[] | null;
  cta?: {
    titre?: string | null;
    sousTitre?: string | null;
    bouton?: string | null;
    lien?: string | null;
  } | null;
  seoTitre?: string | null;
  seoDescription?: string | null;
};

const PAGE_FAQ = groq`*[_type == "pageFaq" && language == $locale][0]{
  hero{eyebrow, titre, description, lienContact, "imageUrl": image.asset->url},
  categories[]{cle, titre},
  cta{titre, sousTitre, bouton, lien},
  seoTitre, seoDescription
}`;

const FAQ_ITEMS = groq`*[_type == "faqItem" && language == $locale] | order(categorie asc, ordre asc){
  question, reponse, categorie
}`;

export async function getPageFaq(locale: Locale): Promise<PageFaqData | null> {
  if (!sanityClient) return null;
  return sanityClient.fetch<PageFaqData | null>(PAGE_FAQ, { locale });
}

export async function getFaqItems(locale: Locale): Promise<FaqItemData[]> {
  if (!sanityClient) return [];
  return sanityClient.fetch<FaqItemData[]>(FAQ_ITEMS, { locale });
}

// ── Page Suivi ───────────────────────────────────────────────────────────────

export type SuiviEtape = {
  jalon?: string | null;
  statut?: string | null;
  position?: string | null;
  chipA?: string | null;
  chipB?: string | null;
  imageUrl?: string | null;
};

export type SuiviTrajet = {
  destination?: string | null;
  destinationCourt?: string | null;
  navire?: string | null;
  positionMer?: string | null;
  latMer?: number | null;
  lonMer?: number | null;
  latArrivee?: number | null;
  lonArrivee?: number | null;
  cap?: number | null;
};

export type PageSuiviData = {
  hero?: {
    eyebrow?: string | null;
    titre?: string | null;
    titreAccent?: string | null;
    description?: string | null;
    placeholderRecherche?: string | null;
    boutonRecherche?: string | null;
    noteDemo?: string | null;
    imageUrl?: string | null;
  } | null;
  resultat?: {
    libelleLatitude?: string | null;
    libelleLongitude?: string | null;
    libelleSignal?: string | null;
    cartePosition?: string | null;
    carteNavire?: string | null;
    carteProgression?: string | null;
    carteEta?: string | null;
    noteContact?: string | null;
    noteContactLien?: string | null;
    positionAvantDepart?: string | null;
    navireAttente?: string | null;
    suffixeDebarque?: string | null;
    libelleVitesse?: string | null;
    libelleCap?: string | null;
  } | null;
  etapes?: SuiviEtape[] | null;
  portDepart?: string | null;
  trajetsDemo?: SuiviTrajet[] | null;
  voyage?: {
    titre?: string | null;
    titreAccent?: string | null;
    etapes?: { titre?: string | null; texte?: string | null; imageUrl?: string | null }[] | null;
  } | null;
  cta?: {
    titre?: string | null;
    sousTitre?: string | null;
    bouton?: string | null;
    lien?: string | null;
    imageUrl?: string | null;
  } | null;
  seoTitre?: string | null;
  seoDescription?: string | null;
};

// ── Page Contact ─────────────────────────────────────────────────────────────

export type PageContactData = {
  hero?: {
    eyebrow?: string | null;
    titre?: string | null;
    description?: string | null;
    imageUrl?: string | null;
  } | null;
  coordonnees?: { libelle?: string | null; valeur?: string | null; type?: string | null }[] | null;
  formulaire?: {
    titre?: string | null;
    placeholderNom?: string | null;
    placeholderTel?: string | null;
    placeholderEmail?: string | null;
    placeholderMessage?: string | null;
    sujets?: string[] | null;
    boutonEnvoyer?: string | null;
    confirmationTitre?: string | null;
    confirmationTexte?: string | null;
    boutonReinitialiser?: string | null;
  } | null;
  centre?: {
    eyebrow?: string | null;
    titre?: string | null;
    texte?: string | null;
    adresse?: string | null;
    noteFaq?: string | null;
    noteFaqLien?: string | null;
    imageUrl?: string | null;
  } | null;
  seoTitre?: string | null;
  seoDescription?: string | null;
};

const PAGE_CONTACT = groq`*[_type == "pageContact" && language == $locale][0]{
  hero{eyebrow, titre, description, "imageUrl": image.asset->url},
  coordonnees[]{libelle, valeur, type},
  formulaire{titre, placeholderNom, placeholderTel, placeholderEmail, placeholderMessage, sujets, boutonEnvoyer, confirmationTitre, confirmationTexte, boutonReinitialiser},
  centre{eyebrow, titre, texte, adresse, noteFaq, noteFaqLien, "imageUrl": image.asset->url},
  seoTitre, seoDescription
}`;

export async function getPageContact(locale: Locale): Promise<PageContactData | null> {
  if (!sanityClient) return null;
  return sanityClient.fetch<PageContactData | null>(PAGE_CONTACT, { locale });
}

const PAGE_SUIVI = groq`*[_type == "pageSuivi" && language == $locale][0]{
  hero{eyebrow, titre, titreAccent, description, placeholderRecherche, boutonRecherche, noteDemo, "imageUrl": image.asset->url},
  resultat{libelleLatitude, libelleLongitude, libelleSignal, cartePosition, carteNavire, carteProgression, carteEta, noteContact, noteContactLien, positionAvantDepart, navireAttente, suffixeDebarque, libelleVitesse, libelleCap},
  etapes[]{jalon, statut, position, chipA, chipB, "imageUrl": image.asset->url},
  portDepart,
  trajetsDemo[]{destination, destinationCourt, navire, positionMer, latMer, lonMer, latArrivee, lonArrivee, cap},
  voyage{titre, titreAccent, etapes[]{titre, texte, "imageUrl": image.asset->url}},
  cta{titre, sousTitre, bouton, lien, "imageUrl": image.asset->url},
  seoTitre, seoDescription
}`;

export async function getPageSuivi(locale: Locale): Promise<PageSuiviData | null> {
  if (!sanityClient) return null;
  return sanityClient.fetch<PageSuiviData | null>(PAGE_SUIVI, { locale });
}
