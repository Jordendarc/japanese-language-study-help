import type { Metadata } from 'next';
import { SITE_NAME } from '@/app/utils/site';

const fullTitle = `Matome tests | ${SITE_NAME}`;
const description = 'Practice chapter review tests with word bank, multiple choice, word order and reading questions, and mix lessons into one shuffled test.';

export const metadata: Metadata = {
  title: { absolute: fullTitle },
  description,
  alternates: { canonical: '/matome' },
  openGraph: { title: fullTitle, description, url: '/matome' },
  twitter: { title: fullTitle, description },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
