import type { SchemaTypeDefinition } from 'sanity';

import { siteSettings } from './singletons/siteSettings';
import { navigation } from './singletons/navigation';
import { footer } from './singletons/footer';

import { hero } from './objects/hero';
import { blocServices } from './objects/blocServices';
import { blocDestinations } from './objects/blocDestinations';
import { blocConteneurs } from './objects/blocConteneurs';
import { bandeauCTA } from './objects/bandeauCTA';
import { faqSection } from './objects/faqSection';
import { temoignages } from './objects/temoignages';
import { texteRiche } from './objects/texteRiche';

import { demandeDevis } from './backoffice/demandeDevis';
import { expedition } from './backoffice/expedition';
import { clientFiche } from './backoffice/clientFiche';
import { conteneurOccasion } from './backoffice/conteneurOccasion';
import { rotation } from './backoffice/rotation';
import { statsMensuelles } from './backoffice/statsMensuelles';

import { page } from './documents/page';
import { pageSuivi } from './documents/pageSuivi';
import { pageContact } from './documents/pageContact';
import { pageFaq } from './documents/pageFaq';
import { pageDevis } from './documents/pageDevis';
import { pageLegale } from './documents/pageLegale';
import { pageAccueil } from './documents/pageAccueil';
import { service } from './documents/service';
import { destination } from './documents/destination';
import { profil } from './documents/profil';
import { faqItem } from './documents/faqItem';
import { temoignage } from './documents/temoignage';

export const schemaTypes: SchemaTypeDefinition[] = [
  // singletons
  siteSettings,
  navigation,
  footer,
  // objects (blocs)
  hero,
  blocServices,
  blocDestinations,
  blocConteneurs,
  bandeauCTA,
  faqSection,
  temoignages,
  texteRiche,
  // documents
  page,
  pageSuivi,
  pageContact,
  pageFaq,
  pageDevis,
  pageLegale,
  pageAccueil,
  service,
  destination,
  profil,
  faqItem,
  temoignage,
];

// Types du back-office — dataset privé « operations » (workspace dédié)
export const backofficeTypes: SchemaTypeDefinition[] = [
  demandeDevis,
  expedition,
  clientFiche,
  conteneurOccasion,
  rotation,
  statsMensuelles,
];
