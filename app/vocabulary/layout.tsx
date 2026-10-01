import type { Metadata } from 'next';
import { SITE_NAME } from '@/app/utils/site';

const fullTitle = `Vocabulary flashcards | ${SITE_NAME}`;
const description = 'Study Japanese vocabulary with flashcards that show readings, meanings, example sentences and kanji breakdowns. Pick your textbook and lessons.';

export const metadata: Metadata = {
  title: { absolute: fullTitle },
  description,
  alternates: { canonical: '/vocabulary/select' },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
