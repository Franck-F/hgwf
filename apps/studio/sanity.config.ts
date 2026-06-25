import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { documentInternationalization } from '@sanity/document-internationalization';
import { schemaTypes } from './schemaTypes';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID!;
const dataset = process.env.SANITY_STUDIO_DATASET || 'production';

// Documents traduisibles (i18n niveau document)
const translatedTypes = ['page', 'service', 'destination', 'profil', 'faqItem', 'temoignage'];

export default defineConfig({
  name: 'hgwf-cargo',
  title: 'HGWF Cargo',
  projectId,
  dataset,
  plugins: [
    structureTool(),
    visionTool(),
    documentInternationalization({
      supportedLanguages: [
        { id: 'fr', title: 'Français' },
        { id: 'en', title: 'English' },
      ],
      schemaTypes: translatedTypes,
    }),
  ],
  schema: { types: schemaTypes },
});
