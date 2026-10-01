import type { Metadata } from 'next';
import { SITE_NAME } from '@/app/utils/site';

const fullTitle = `Grammar flashcards | ${SITE_NAME}`;
const description = 'Study Japanese grammar points with formation, meaning, nuance and example sentences from your textbook lessons.';

export const metadata: Metadata = {
  title: { absolute: fullTitle },
  description,
  alternates: { canonical: '/grammar/select' },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
