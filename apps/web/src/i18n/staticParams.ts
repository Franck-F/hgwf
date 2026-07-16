import { routing } from './routing';

// Avec `output: 'export'`, le serveur de dev de Next 16 exige que chaque page
// sous [locale] énumère ses propres paramètres (celui du layout ne suffit pas).
// À ré-exporter depuis chaque page : export { generateStaticParams } from '@/i18n/staticParams';
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
