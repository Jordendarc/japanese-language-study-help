import type { Metadata } from 'next';
import { SITE_NAME } from '@/app/utils/site';

const fullTitle = `Matome test | ${SITE_NAME}`;
const description = 'Take a matome chapter test.';

export const metadata: Metadata = {
  title: { absolute: fullTitle },
  description,
  alternates: { canonical: '/matome' },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
