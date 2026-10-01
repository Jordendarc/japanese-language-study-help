import type { Metadata } from 'next';
import { SITE_NAME } from '@/app/utils/site';

const fullTitle = `Kanji reading test | ${SITE_NAME}`;
const description = 'Practice typing the hiragana reading of random kanji words from the chapters you choose and see right away which ones you got right.';

export const metadata: Metadata = {
  title: { absolute: fullTitle },
  description,
  alternates: { canonical: '/kanji-test/select' },
  openGraph: { title: fullTitle, description, url: '/kanji-test/select' },
  twitter: { title: fullTitle, description },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
