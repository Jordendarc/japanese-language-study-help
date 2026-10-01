import type { Metadata } from 'next';
import { SITE_NAME } from '@/app/utils/site';

const fullTitle = `Mixed matome test | ${SITE_NAME}`;
const description = 'Take a shuffled matome test built from several lessons.';

export const metadata: Metadata = {
  title: { absolute: fullTitle },
  description,
  alternates: { canonical: '/matome' },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
