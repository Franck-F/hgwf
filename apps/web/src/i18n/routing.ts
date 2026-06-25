import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from '@hgwf/shared';

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
});
