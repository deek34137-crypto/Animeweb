import { createNavigation } from 'next-intl/navigation';

export const locales = ['en', 'es', 'ja'] as const;
export const localePrefix = 'always'; // Prefixes paths with the locale always (e.g. /es/search)

export const { Link, redirect, usePathname, useRouter } =
  createNavigation({ locales, localePrefix });
