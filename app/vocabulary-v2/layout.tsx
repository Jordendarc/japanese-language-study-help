import type { Metadata } from 'next';
import { SITE_NAME } from '@/app/utils/site';

// Work in progress: kept out of search results until it replaces the current vocabulary section
export const metadata: Metadata = {
  title: { absolute: `Vocabulary V2 | ${SITE_NAME}` },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
