import type { Metadata } from 'next';
import { SITE_NAME } from '@/app/utils/site';

const fullTitle = `Kanji reading test | ${SITE_NAME}`;
const description = 'Take a kanji reading test: type the hiragana reading of random kanji words.';

export const metadata: Metadata = {
  title: { absolute: fullTitle },
  description,
  alternates: { canonical: '/kanji-test/select' },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
