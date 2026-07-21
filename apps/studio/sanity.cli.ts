import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET,
  },
  // Nom d'hôte du Studio publié → https://hgwf-cargo.sanity.studio
  studioHost: 'hgwf-cargo',
});
