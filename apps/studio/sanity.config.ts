import { defineConfig, buildLegacyTheme } from 'sanity';
import { structureTool } from 'sanity/structure';
import type { StructureBuilder } from 'sanity/structure';
import { presentationTool, defineDocuments } from 'sanity/presentation';
import { visionTool } from '@sanity/vision';
import { documentInternationalization } from '@sanity/document-internationalization';
import { frFRLocale } from '@sanity/locale-fr-fr';
import { media } from 'sanity-plugin-media';
import {
  HomeIcon,
  MarkerIcon,
  EnvelopeIcon,
  ClipboardIcon,
  HelpCircleIcon,
  BookIcon,
  CogIcon,
  DocumentsIcon,
  EarthGlobeIcon,
  PackageIcon,
  UsersIcon,
  CommentIcon,
  MenuIcon,
  BlockContentIcon,
  CaseIcon,
  BarChartIcon,
} from '@sanity/icons';
import { schemaTypes, backofficeTypes } from './schemaTypes';
import { IconeHgwf } from './components/IconeHgwf';
import { BackOffice } from './tools/backoffice/BackOffice';

// Palette HGWF — voir tokens/colors.css à la racine du monorepo
const themeHgwf = buildLegacyTheme({
  '--black': '#0c2a44',
  '--white': '#fffdf8',
  '--gray': '#29638d',
  '--gray-base': '#29638d',
  '--component-bg': '#fffdf8',
  '--component-text-color': '#12395b',
  '--brand-primary': '#12395b',
  '--default-button-color': '#29638d',
  '--default-button-primary-color': '#ff6f5e',
  '--default-button-success-color': '#4ea8de',
  '--default-button-warning-color': '#ffb23e',
  '--default-button-danger-color': '#ff6f5e',
  '--state-info-color': '#4ea8de',
  '--state-success-color': '#4ea8de',
  '--state-warning-color': '#ffb23e',
  '--state-danger-color': '#ff6f5e',
  '--main-navigation-color': '#12395b',
  '--main-navigation-color--inverted': '#fbf4e6',
  '--focus-color': '#ff6f5e',
});

const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
if (!projectId) throw new Error('SANITY_STUDIO_PROJECT_ID est requis');

const dataset = process.env.SANITY_STUDIO_DATASET || 'production';
// Données du back-office : dataset PRIVÉ (les demandes contiennent des
// données personnelles ; « production » est public pour le site statique).
const datasetOperations = process.env.SANITY_STUDIO_OPERATIONS_DATASET || 'operations';
// Origine de la préversion SSR pour l'aperçu visuel :
//  - dev local  → http://localhost:3000 (next dev en mode preview) ;
//  - Studio publié → l'URL Vercel de préversion (via SANITY_STUDIO_PREVIEW_ORIGIN).
const previewOrigin = process.env.SANITY_STUDIO_PREVIEW_ORIGIN || 'http://localhost:3000';
const STUDIO_API_VERSION = '2024-10-01';

// Documents traduisibles (i18n niveau document)
const translatedTypes = [
  'page',
  'pageSuivi',
  'pageContact',
  'pageFaq',
  'pageDevis',
  'pageLegale',
  'pageAccueil',
  'service',
  'destination',
  'profil',
  'faqItem',
  'temoignage',
];

// Types singleton (un seul document par type)
const singletonTypes = ['siteSettings', 'navigation', 'footer'];

// Catégories FAQ : mêmes clés que le champ `categorie` du schéma faqItem.
const categoriesFaq = [
  { cle: 'expeditions', titre: 'Expéditions' },
  { cle: 'tarifs', titre: 'Tarifs & délais' },
  { cle: 'conteneurs', titre: 'Conteneurs d’occasion' },
];

// Pages du site, épinglées sur leur document FR (les traductions EN
// se créent depuis le menu de langue du document).
const pagesFixes = [
  { titre: 'Accueil', type: 'pageAccueil', id: 'pageAccueil-fr', icon: HomeIcon },
  { titre: "Suivi d'envoi", type: 'pageSuivi', id: 'pageSuivi-fr', icon: MarkerIcon },
  { titre: 'Nous contacter', type: 'pageContact', id: 'pageContact-fr', icon: EnvelopeIcon },
  { titre: 'Demande de devis', type: 'pageDevis', id: 'pageDevis-fr', icon: ClipboardIcon },
  { titre: 'FAQ — en-tête de page', type: 'pageFaq', id: 'pageFaq-fr', icon: HelpCircleIcon },
];

// Pages légales, épinglées sur leur document FR.
const pagesLegales = [
  { titre: 'Mentions légales', id: 'pageLegale-mentions-fr', icon: BookIcon },
  { titre: 'Politique de confidentialité', id: 'pageLegale-confidentialite-fr', icon: BookIcon },
  { titre: 'CGV', id: 'pageLegale-cgv-fr', icon: BookIcon },
];

function structureContenu(S: StructureBuilder) {
  return S.list()
    .title('Contenu')
    .items([
      S.listItem()
        .title('Pages')
        .id('pages')
        .icon(DocumentsIcon)
        .child(
          S.list()
            .title('Pages')
            .items(
              pagesFixes.map((p) =>
                S.listItem()
                  .title(p.titre)
                  .id(p.id)
                  .icon(p.icon)
                  .child(S.document().schemaType(p.type).documentId(p.id).title(p.titre)),
              ),
            ),
        ),
      S.listItem()
        .title('Questions FAQ')
        .id('faqItems')
        .icon(HelpCircleIcon)
        .child(
          S.list()
            .title('Questions FAQ')
            .items([
              ...categoriesFaq.map((c) =>
                S.listItem()
                  .title(c.titre)
                  .id(`faq-${c.cle}`)
                  .icon(HelpCircleIcon)
                  .child(
                    S.documentList()
                      .schemaType('faqItem')
                      .apiVersion(STUDIO_API_VERSION)
                      .title(c.titre)
                      .filter('_type == "faqItem" && categorie == $cle')
                      .params({ cle: c.cle })
                      .defaultOrdering([{ field: 'ordre', direction: 'asc' }])
                      .initialValueTemplates([S.initialValueTemplateItem(`faqItem-${c.cle}`)]),
                  ),
              ),
              S.divider(),
              S.listItem()
                .title('Toutes les questions')
                .id('faq-toutes')
                .icon(DocumentsIcon)
                .child(
                  S.documentTypeList('faqItem')
                    .title('Toutes les questions')
                    .defaultOrdering([
                      { field: 'categorie', direction: 'asc' },
                      { field: 'ordre', direction: 'asc' },
                    ]),
                ),
            ]),
        ),
      S.listItem()
        .title('Pages légales')
        .id('pagesLegales')
        .icon(BookIcon)
        .child(
          S.list()
            .title('Pages légales')
            .items(
              pagesLegales.map((p) =>
                S.listItem()
                  .title(p.titre)
                  .id(p.id)
                  .icon(p.icon)
                  .child(S.document().schemaType('pageLegale').documentId(p.id).title(p.titre)),
              ),
            ),
        ),
      S.divider(),
      S.listItem()
        .title('Contenus')
        .id('contenus')
        .icon(BlockContentIcon)
        .child(
          S.list()
            .title('Contenus')
            .items([
              S.documentTypeListItem('service').title('Services').icon(PackageIcon),
              S.documentTypeListItem('destination').title('Destinations').icon(EarthGlobeIcon),
              S.documentTypeListItem('profil').title('Profils').icon(UsersIcon),
              S.documentTypeListItem('temoignage').title('Témoignages').icon(CommentIcon),
              S.documentTypeListItem('page').title('Pages libres').icon(DocumentsIcon),
            ]),
        ),
      S.divider(),
      S.listItem()
        .title('Réglages')
        .id('reglages')
        .icon(CogIcon)
        .child(
          S.list()
            .title('Réglages')
            .items([
              S.listItem()
                .title('Navigation')
                .id('navigation')
                .icon(MenuIcon)
                .child(
                  S.document().schemaType('navigation').documentId('navigation').title('Navigation'),
                ),
              S.listItem()
                .title('Pied de page')
                .id('footer')
                .icon(DocumentsIcon)
                .child(S.document().schemaType('footer').documentId('footer').title('Pied de page')),
              S.listItem()
                .title('Paramètres du site')
                .id('siteSettings')
                .icon(CogIcon)
                .child(
                  S.document()
                    .schemaType('siteSettings')
                    .documentId('siteSettings')
                    .title('Paramètres du site'),
                ),
            ]),
        ),
    ]);
}

// Étapes du pipeline devis : mêmes index que STATUTS_DEMANDE du schéma.
const pipelineDevis = [
  { titre: 'À traiter (nouvelles + en cours)', filtre: 'statut <= 1 || !defined(statut)' },
  { titre: 'Devis envoyés, en attente', filtre: 'statut == 2' },
  { titre: 'Acceptées, expédition à créer', filtre: 'statut == 3' },
  { titre: 'Converties en expédition', filtre: 'statut == 4' },
  { titre: 'Refusées / sans suite', filtre: 'statut == 5' },
];

function structureOperations(S: StructureBuilder) {
  return S.list()
    .title('Données')
    .items([
      S.listItem()
        .title('Demandes de devis')
        .id('demandesDevis')
        .icon(ClipboardIcon)
        .child(
          S.list()
            .title('Demandes de devis')
            .items([
              ...pipelineDevis.map((p, i) =>
                S.listItem()
                  .title(p.titre)
                  .id(`devis-etape-${i}`)
                  .icon(ClipboardIcon)
                  .child(
                    S.documentList()
                      .schemaType('demandeDevis')
                      .apiVersion(STUDIO_API_VERSION)
                      .title(p.titre)
                      .filter(`_type == "demandeDevis" && (${p.filtre})`)
                      .defaultOrdering([{ field: '_createdAt', direction: 'desc' }]),
                  ),
              ),
              S.divider(),
              S.documentTypeListItem('demandeDevis').title('Toutes les demandes').icon(DocumentsIcon),
            ]),
        ),
      S.documentTypeListItem('expedition').title('Expéditions').icon(MarkerIcon),
      S.documentTypeListItem('clientFiche').title('Clients').icon(UsersIcon),
      S.documentTypeListItem('conteneurOccasion').title('Conteneurs d’occasion').icon(PackageIcon),
      S.documentTypeListItem('rotation').title('Rotations maritimes').icon(EarthGlobeIcon),
      S.listItem()
        .title('Statistiques mensuelles')
        .id('statsMensuelles')
        .icon(BarChartIcon)
        .child(
          S.document()
            .schemaType('statsMensuelles')
            .documentId('statsMensuelles')
            .title('Statistiques mensuelles'),
        ),
    ]);
}

export default defineConfig([
  {
    name: 'contenu',
    title: 'HGWF Cargo — Site',
    basePath: '/contenu',
    icon: IconeHgwf,
    theme: themeHgwf,
    projectId,
    dataset,
    plugins: [
      structureTool({ structure: structureContenu }),
      presentationTool({
        title: 'Aperçu du site',
        previewUrl: `${previewOrigin}/fr/`,
        resolve: {
          mainDocuments: defineDocuments([
            { route: '/:locale/', filter: `_type == "pageAccueil" && language == $locale` },
            { route: '/:locale/suivi/', filter: `_type == "pageSuivi" && language == $locale` },
            { route: '/:locale/contact/', filter: `_type == "pageContact" && language == $locale` },
            { route: '/:locale/faq/', filter: `_type == "pageFaq" && language == $locale` },
            { route: '/:locale/devis/', filter: `_type == "pageDevis" && language == $locale` },
            {
              route: '/:locale/mentions-legales/',
              filter: `_type == "pageLegale" && slug.current == "mentions-legales" && language == $locale`,
            },
            {
              route: '/:locale/confidentialite/',
              filter: `_type == "pageLegale" && slug.current == "confidentialite" && language == $locale`,
            },
            {
              route: '/:locale/cgv/',
              filter: `_type == "pageLegale" && slug.current == "cgv" && language == $locale`,
            },
          ]),
        },
      }),
      visionTool(),
      documentInternationalization({
        supportedLanguages: [
          { id: 'fr', title: 'Français' },
          { id: 'en', title: 'English' },
        ],
        schemaTypes: translatedTypes,
      }),
      frFRLocale(),
      media(),
    ],
    schema: {
      types: schemaTypes,
      templates: (templates) => [
        ...templates.filter((t) => !singletonTypes.includes(t.schemaType)),
        // Nouvelle question FAQ pré-remplie depuis la liste de sa catégorie
        ...categoriesFaq.map((c) => ({
          id: `faqItem-${c.cle}`,
          title: `Question — ${c.titre}`,
          schemaType: 'faqItem',
          value: { categorie: c.cle, language: 'fr' },
        })),
      ],
    },
  },
  {
    name: 'operations',
    title: 'HGWF Cargo — Back-office',
    basePath: '/operations',
    icon: IconeHgwf,
    theme: themeHgwf,
    projectId,
    dataset: datasetOperations,
    plugins: [structureTool({ structure: structureOperations }), visionTool(), frFRLocale()],
    tools: (prev) => [
      {
        name: 'back-office',
        title: 'Back-office',
        icon: CaseIcon,
        component: BackOffice,
      },
      ...prev,
    ],
    schema: {
      types: backofficeTypes,
      templates: (templates) => templates.filter((t) => t.schemaType !== 'statsMensuelles'),
    },
  },
]);
