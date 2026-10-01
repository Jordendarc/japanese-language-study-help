import type { Metadata } from 'next';
import { SITE_NAME } from '@/app/utils/site';

const fullTitle = `JLPT N3 practice quiz | ${SITE_NAME}`;
const description = 'Practice JLPT N3 kanji reading and vocabulary questions with explanations for every answer.';

export const metadata: Metadata = {
  title: { absolute: fullTitle },
  description,
  alternates: { canonical: '/n3-quiz' },
  openGraph: { title: fullTitle, description, url: '/n3-quiz' },
  twitter: { title: fullTitle, description },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
