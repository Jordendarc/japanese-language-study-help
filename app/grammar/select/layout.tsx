import type { Metadata } from 'next';
import { SITE_NAME } from '@/app/utils/site';

const fullTitle = `Grammar flashcards | ${SITE_NAME}`;
const description = 'Choose a textbook and lessons to study Japanese grammar points with formation, meaning, nuance and example sentences.';

export const metadata: Metadata = {
  title: { absolute: fullTitle },
  description,
  alternates: { canonical: '/grammar/select' },
  openGraph: { title: fullTitle, description, url: '/grammar/select' },
  twitter: { title: fullTitle, description },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
