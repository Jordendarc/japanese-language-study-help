import type { Metadata } from 'next';
import { SITE_NAME } from '@/app/utils/site';

// Personal stats: useful to the signed-in user, nothing for search engines
export const metadata: Metadata = {
  title: { absolute: `Your progress | ${SITE_NAME}` },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
