import type { Metadata } from 'next';
import { SITE_NAME } from '@/app/utils/site';

const fullTitle = `Vocabulary flashcards | ${SITE_NAME}`;
const description = 'Pick a textbook and lessons, then drill Japanese vocabulary flashcards with readings, meanings, example sentences and kanji breakdowns. Review due cards with spaced repetition.';

export const metadata: Metadata = {
  title: { absolute: fullTitle },
  description,
  alternates: { canonical: '/vocabulary/select' },
  openGraph: { title: fullTitle, description, url: '/vocabulary/select' },
  twitter: { title: fullTitle, description },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
