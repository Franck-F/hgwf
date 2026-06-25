import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export function Header() {
  const t = useTranslations('Nav');
  return (
    <header>
      <nav aria-label="Navigation principale">
        <Link href="/">{t('home')}</Link>
        <Link href="/services">{t('services')}</Link>
        <Link href="/destinations">{t('destinations')}</Link>
        <Link href="/contact">{t('contact')}</Link>
      </nav>
    </header>
  );
}
