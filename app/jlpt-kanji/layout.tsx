import type { Metadata } from 'next';
import { SITE_NAME } from '@/app/utils/site';

const fullTitle = `JLPT kanji test | ${SITE_NAME}`;
const description = 'JLPT-style kanji questions (漢字読み and 表記) built from your textbook words, with explanations for every wrong answer.';

export const metadata: Metadata = {
  title: { absolute: fullTitle },
  description,
  alternates: { canonical: '/jlpt-kanji/select' },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
