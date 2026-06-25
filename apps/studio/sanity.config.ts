import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import type { StructureBuilder } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { documentInternationalization } from '@sanity/document-internationalization';
import { schemaTypes } from './schemaTypes';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
if (!projectId) throw new Error('SANITY_STUDIO_PROJECT_ID est requis');

const dataset = process.env.SANITY_STUDIO_DATASET || 'production';

// Documents traduisibles (i18n niveau document)
const translatedTypes = ['page', 'service', 'destination', 'profil', 'faqItem', 'temoignage'];

// Types singleton (un seul document par type)
const singletonTypes = ['siteSettings', 'navigation', 'footer'];

function singletonStructure(S: StructureBuilder) {
  return S.list()
    .title('Contenu')
    .items([
      S.listItem()
        .title('Paramètres du site')
        .id('siteSettings')
        .child(
          S.document().schemaType('siteSettings').documentId('siteSettings').title('Paramètres du site'),
        ),
      S.listItem()
        .title('Navigation')
        .id('navigation')
        .child(
          S.document().schemaType('navigation').documentId('navigation').title('Navigation'),
        ),
      S.listItem()
        .title('Pied de page')
        .id('footer')
        .child(S.document().schemaType('footer').documentId('footer').title('Pied de page')),
      S.divider(),
      ...S.documentTypeListItems().filter(
        (item) => item.getId() != null && !singletonTypes.includes(item.getId() as string),
      ),
    ]);
}

export default defineConfig({
  name: 'hgwf-cargo',
  title: 'HGWF Cargo',
  projectId,
  dataset,
  plugins: [
    structureTool({ structure: singletonStructure }),
    visionTool(),
    documentInternationalization({
      supportedLanguages: [
        { id: 'fr', title: 'Français' },
        { id: 'en', title: 'English' },
      ],
      schemaTypes: translatedTypes,
    }),
  ],
  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter((t) => !singletonTypes.includes(t.schemaType)),
  },
});
