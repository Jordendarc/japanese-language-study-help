import type { Metadata } from 'next';
import { SITE_NAME } from '@/app/utils/site';

const fullTitle = `Kanji dictionary | ${SITE_NAME}`;
const description = 'Search a Japanese kanji dictionary by character, meaning or vocabulary word and see every related word with readings and examples.';

export const metadata: Metadata = {
  title: { absolute: fullTitle },
  description,
  alternates: { canonical: '/kanji' },
  openGraph: { title: fullTitle, description, url: '/kanji' },
  twitter: { title: fullTitle, description },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
