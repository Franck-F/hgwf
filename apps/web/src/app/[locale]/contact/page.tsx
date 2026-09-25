import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { defaultLocale, isLocale, type Locale } from '@hgwf/shared';
import { getPageContact, getSiteSettings } from '@/sanity/queries';
import { metadonneesPage } from '@/seo/metadonnees';
import { FaqCiblee } from '@/components/FaqCiblee';
import { FAQ_CIBLEES } from '@/content/faqCiblees';
import { ContactForm, type ContactFormContent } from '@/components/contact/ContactForm';

export { generateStaticParams } from '@/i18n/staticParams';

// Contenu par défaut : copie de la maquette Nous contacter.dc.html (Claude Design).
const HERO_DEFAUT = {
  eyebrow: 'Par mail, téléphone ou WhatsApp',
  titre: 'Nous contacter.',
  description:
    'Vous êtes nombreux à nous contacter, et nous en sommes ravis ! Toutes vos demandes sont traitées avec la plus grande attention. Un délai moyen de 24 à 48 h est souvent nécessaire pour répondre à vos demandes de devis.',
  imageUrl: null as string | null,
};

const COORDONNEES_DEFAUT = [
  { libelle: 'E-mail', valeur: 'contact@hgwf-cargo.fr', type: 'email' },
  { libelle: 'Marie', valeur: '+33 6 27 05 69 34', type: 'tel' },
  { libelle: 'Fabrice', valeur: '+33 7 64 16 90 82', type: 'tel' },
  { libelle: 'Clara', valeur: '+33 6 13 37 71 14', type: 'tel' },
];

const FORMULAIRE_DEFAUT = {
  titre: 'Écrivez-nous.',
  placeholderNom: 'Nom et prénom',
  placeholderTel: 'Téléphone / WhatsApp',
  placeholderEmail: 'E-mail',
  placeholderMessage: 'Votre message : destination, nature des biens, dates souhaitées…',
  sujets: [
    'Demande de devis',
    "Suivi d'un envoi",
    "Conteneur d'occasion",
    'Déménagement Outre-mer',
    'Autre question',
  ],
  boutonEnvoyer: 'Envoyer le message',
  confirmationTitre: 'Message envoyé.',
  confirmationTexte:
    "Merci {nom}, votre message est bien parti. L'équipe vous répond sous 24 à 48 h, par mail ou téléphone.",
  boutonReinitialiser: 'Envoyer un autre message',
};

// Mention RGPD : ni Sanity ni FORMULAIRE_DEFAUT ne sont localisés par langue
// (le CMS ne connaît pas ce champ), donc on choisit la traduction ici même,
// à partir de la locale de la page — même principe que contenuLegal() pour
// les pages légales.
const MENTION_RGPD_FR = {
  texte:
    'Les informations recueillies servent uniquement à traiter votre demande. Elles sont conservées trois ans et ne sont jamais cédées. Vous disposez d’un droit d’accès, de rectification et d’effacement ; voir notre',
  lienLibelle: 'politique de confidentialité',
};

const MENTION_RGPD_EN = {
  texte:
    'The information collected is used only to process your request. It is kept for three years and is never shared with third parties. You have a right of access, rectification and erasure; see our',
  lienLibelle: 'privacy policy',
};

const CENTRE_DEFAUT = {
  eyebrow: 'Sur RDV uniquement',
  titre: 'Nous rendre visite, ou faire livrer vos colis.',
  texte:
    'Notre centre logistique vous accueille sur rendez-vous pour le dépôt de vos colis, cartons et effets personnels.',
  adresse: '10 RUE DIDEROT\n93110 ROSNY-SOUS-BOIS',
  noteFaq: 'Des questions sur nos offres et le transport longue distance ? Les réponses sont dans la',
  noteFaqLien: 'Foire aux questions',
  imageUrl: null as string | null,
};

const SEO_DEFAUT = {
  titre: 'Contact transitaire maritime à Rosny-sous-Bois · HGWF Cargo',
  description:
    'Contactez HGWF Cargo par mail, téléphone ou WhatsApp : devis gratuit, suivi d’envoi, conteneurs et déménagement Outre-mer. Réponse sous 24 à 48 h.',
};

// Version anglaise des contenus par défaut (le contenu Sanity EN prime).
const HERO_EN = {
  eyebrow: 'By email, phone or WhatsApp',
  titre: 'Contact us.',
  description:
    'Many of you get in touch with us, and we are delighted! Every request is handled with the greatest care. Quote requests usually receive a reply within 24 to 48 hours.',
  imageUrl: null as string | null,
};

const FORMULAIRE_EN = {
  titre: 'Write to us.',
  placeholderNom: 'Full name',
  placeholderTel: 'Phone / WhatsApp',
  placeholderEmail: 'Email',
  placeholderMessage: 'Your message: destination, nature of the goods, preferred dates…',
  sujets: [
    'Quote request',
    'Shipment tracking',
    'Used container',
    'Overseas removal',
    'Other question',
  ],
  boutonEnvoyer: 'Send the message',
  confirmationTitre: 'Message sent.',
  confirmationTexte:
    'Thank you {nom}, your message is on its way. The team will reply within 24 to 48 hours, by email or phone.',
  boutonReinitialiser: 'Send another message',
};

const CENTRE_EN = {
  eyebrow: 'By appointment only',
  titre: 'Visit us, or have your parcels delivered.',
  texte:
    'Our logistics centre welcomes you by appointment to drop off your parcels, boxes and personal effects.',
  adresse: '10 RUE DIDEROT\n93110 ROSNY-SOUS-BOIS',
  noteFaq: 'Questions about our services and long-distance shipping? The answers are in the',
  noteFaqLien: 'FAQ',
  imageUrl: null as string | null,
};

function resolveLocale(locale: string): Locale {
  return isLocale(locale) ? locale : defaultLocale;
}

async function getContenu(locale: Locale) {
  const [data, settings] = await Promise.all([getPageContact(locale), getSiteSettings()]);

  const en = locale === 'en';
  const HERO_D = en ? HERO_EN : HERO_DEFAUT;
  const FORM_D = en ? FORMULAIRE_EN : FORMULAIRE_DEFAUT;
  const CENTRE_D = en ? CENTRE_EN : CENTRE_DEFAUT;

  const hero = {
    eyebrow: data?.hero?.eyebrow ?? HERO_D.eyebrow,
    titre: data?.hero?.titre ?? HERO_D.titre,
    description: data?.hero?.description ?? HERO_D.description,
    imageUrl: data?.hero?.imageUrl ?? HERO_D.imageUrl,
  };

  const coordonnees = data?.coordonnees?.length
    ? data.coordonnees.map((c) => ({
        libelle: c.libelle ?? '',
        valeur: c.valeur ?? '',
        type: c.type === 'email' ? 'email' : 'tel',
      }))
    : COORDONNEES_DEFAUT;

  const formulaire: ContactFormContent = {
    titre: data?.formulaire?.titre ?? FORM_D.titre,
    placeholderNom: data?.formulaire?.placeholderNom ?? FORM_D.placeholderNom,
    placeholderTel: data?.formulaire?.placeholderTel ?? FORM_D.placeholderTel,
    placeholderEmail: data?.formulaire?.placeholderEmail ?? FORM_D.placeholderEmail,
    placeholderMessage: data?.formulaire?.placeholderMessage ?? FORM_D.placeholderMessage,
    sujets: data?.formulaire?.sujets?.length ? data.formulaire.sujets : FORM_D.sujets,
    boutonEnvoyer: data?.formulaire?.boutonEnvoyer ?? FORM_D.boutonEnvoyer,
    confirmationTitre: data?.formulaire?.confirmationTitre ?? FORM_D.confirmationTitre,
    confirmationTexte: data?.formulaire?.confirmationTexte ?? FORM_D.confirmationTexte,
    boutonReinitialiser: data?.formulaire?.boutonReinitialiser ?? FORM_D.boutonReinitialiser,
    emailDestinataire: settings?.email ?? 'contact@hgwf-cargo.fr',
    mentionRgpd: locale === 'en' ? MENTION_RGPD_EN : MENTION_RGPD_FR,
    libelleSujet: locale === 'en' ? 'Subject' : 'Sujet',
    erreurContact:
      locale === 'en'
        ? 'Please provide your name and at least one way to contact you (email or phone).'
        : 'Indiquez votre nom et au moins un moyen de contact (e-mail ou téléphone).',
  };

  const centre = {
    eyebrow: data?.centre?.eyebrow ?? CENTRE_D.eyebrow,
    titre: data?.centre?.titre ?? CENTRE_D.titre,
    texte: data?.centre?.texte ?? CENTRE_D.texte,
    adresse: data?.centre?.adresse ?? CENTRE_D.adresse,
    noteFaq: data?.centre?.noteFaq ?? CENTRE_D.noteFaq,
    noteFaqLien: data?.centre?.noteFaqLien ?? CENTRE_D.noteFaqLien,
    imageUrl: data?.centre?.imageUrl ?? CENTRE_D.imageUrl,
  };

  const seoEn = {
    titre: 'Contact our freight forwarder near Paris · HGWF Cargo',
    description:
      'Contact HGWF Cargo by email, phone or WhatsApp: free quote, shipment tracking, containers and overseas removals. Reply within 24–48 h.',
  };
  const seoDefaut = locale === 'en' ? seoEn : SEO_DEFAUT;
  const seo = {
    titre: data?.seoTitre ?? seoDefaut.titre,
    description: data?.seoDescription ?? seoDefaut.description,
  };

  return { hero, coordonnees, formulaire, centre, seo };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = resolveLocale(locale);
  const { seo } = await getContenu(l);
  return metadonneesPage({ locale: l, chemin: '/contact', titre: seo.titre, description: seo.description });
}

function IconeEmail() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#FF6F5E" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconeTel() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#4EA8DE" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { hero, coordonnees, formulaire, centre } = await getContenu(resolveLocale(locale));

  return (
    <main>
      {/* En-tête */}
      <header>
        <div className="hero-photo relative isolate flex flex-col overflow-hidden px-5 sm:px-8 pt-32 sm:pt-[150px] pb-[72px] text-creme md:px-[72px]">
          {hero.imageUrl ? (
            <Image
              src={hero.imageUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              className="-z-10 object-cover object-[center_18%]"
            />
          ) : (
            <span className="absolute inset-0 -z-10 bg-marine" aria-hidden="true" />
          )}
          <span
            className="absolute inset-0 -z-10 bg-linear-92 from-marine/92 from-0% via-marine/65 via-55% to-marine/30 to-100%"
            aria-hidden="true"
          />
          <div className="hero-entree flex flex-col gap-4">
            <span className="text-xs font-medium tracking-[0.32em] text-or uppercase">{hero.eyebrow}</span>
            <h1 className="m-0 text-4xl leading-[1.05] font-bold tracking-[-0.03em] uppercase md:text-5xl">
              {hero.titre}
            </h1>
            <p className="m-0 max-w-[56ch] text-base leading-[1.55] opacity-85">{hero.description}</p>
          </div>
        </div>
      </header>

      {/* Coordonnées */}
      <section className="mx-auto max-w-[1160px] px-5 sm:px-8 pt-12">
        <div className="revele-cascade grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {coordonnees.map((c) => (
            <a
              key={c.libelle + c.valeur}
              href={`${c.type === 'email' ? 'mailto:' : 'tel:'}${c.valeur.replace(/\s/g, '')}`}
              className="presse flex flex-col gap-3 rounded-xl border border-marine/14 p-6 hover:bg-creme"
            >
              {c.type === 'email' ? <IconeEmail /> : <IconeTel />}
              <span className="text-[11px] font-medium tracking-[0.32em] text-encre-douce uppercase">
                {c.libelle}
              </span>
              <span className="font-mono text-sm">{c.valeur}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Formulaire */}
      <section className="mx-auto max-w-[1160px] px-5 sm:px-8 pt-14">
        <ContactForm content={formulaire} />
      </section>

      {/* Centre logistique */}
      <section className="mx-auto max-w-[1160px] px-5 sm:px-8 pt-14 pb-22">
        <div className="grid grid-cols-1 items-center gap-12 rounded-3xl border border-marine/14 bg-creme p-8 md:grid-cols-2 md:p-12">
          <div className="revele flex flex-col gap-4">
            <span className="text-xs font-medium tracking-[0.32em] text-encre-douce uppercase">
              {centre.eyebrow}
            </span>
            <h2 className="m-0 text-3xl leading-[1.1] font-bold tracking-[-0.03em] uppercase">{centre.titre}</h2>
            <p className="m-0 text-[15px] leading-[1.55] text-encre-douce">{centre.texte}</p>
            <div className="flex flex-col gap-1.5 font-mono text-sm">
              {centre.adresse.split('\n').map((ligne) => (
                <span key={ligne}>{ligne}</span>
              ))}
            </div>
            <p className="m-0 text-sm leading-[1.55] text-encre-douce">
              {centre.noteFaq}{' '}
              <Link href="/faq" className="font-medium underline">
                {centre.noteFaqLien}
              </Link>
              .
            </p>
          </div>
          <div className="revele-image relative h-[300px] min-w-0 overflow-hidden rounded-2xl bg-marine">
            {centre.imageUrl && (
              <Image src={centre.imageUrl} alt={locale === 'en' ? 'HGWF Cargo logistics centre' : 'Centre logistique HGWF Cargo'} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            )}
          </div>
        </div>
      </section>
      <FaqCiblee {...FAQ_CIBLEES.contact[resolveLocale(locale)]} className="pt-16 pb-20" />
    </main>
  );
}
