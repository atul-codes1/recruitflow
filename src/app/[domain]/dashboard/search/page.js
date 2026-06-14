import SearchClient from './SearchClient';

export const metadata = {
  title: 'AI Search — RecruitFlow',
  description: 'Search your candidate database using natural language powered by AI.',
};

/**
 * AI Search Page (Server Component)
 * 
 * Route: `/[domain]/dashboard/search`
 * 
 * Thin wrapper that injects SEO metadata and renders the interactive `SearchClient`.
 */
export default function SearchPage() {
  return <SearchClient />;
}
