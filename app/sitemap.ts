import type { MetadataRoute } from 'next';
import { SITE_URL } from './utils/site';

// Only pages that make sense as a landing page; study sessions need a selection and are noindexed
const PAGES: { path: string; priority: number }[] = [
  { path: '/', priority: 1 },
  { path: '/vocabulary/select', priority: 0.8 },
  { path: '/grammar/select', priority: 0.8 },
  { path: '/kanji', priority: 0.8 },
  { path: '/kanji-test/select', priority: 0.7 },
  { path: '/matome', priority: 0.7 },
  { path: '/n3-quiz', priority: 0.7 },
  { path: '/search', priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: 'monthly',
    priority,
  }));
}
