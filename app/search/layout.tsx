import type { Metadata } from 'next';
import { SITE_NAME } from '@/app/utils/site';

const fullTitle = `Search vocabulary, grammar and kanji | ${SITE_NAME}`;
const description = 'Search all vocabulary, grammar points and kanji in one place by Japanese, reading or English.';

export const metadata: Metadata = {
  title: { absolute: fullTitle },
  description,
  alternates: { canonical: '/search' },
  openGraph: { title: fullTitle, description, url: '/search' },
  twitter: { title: fullTitle, description },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
