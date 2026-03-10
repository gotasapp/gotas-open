import type { Metadata } from 'next';
import { getCategories } from '@/lib/actions/category-actions';

export async function generateMetadata(): Promise<Metadata> {
  let teamsList = '';
  try {
    const categories = await getCategories();
    if (categories?.length) {
      teamsList = categories.map(c => c.name).join(', ');
    }
  } catch {}

  const title = 'Resgates – CARDS DO FUTEBOL';
  const description = teamsList
    ? `Resgate seus CARDS DO FUTEBOL. Explore cards disponíveis dos times: ${teamsList}.`
    : 'Resgate seus CARDS DO FUTEBOL e explore cards disponíveis.';

  return {
    title,
    description,
    alternates: { canonical: '/mints' },
    openGraph: {
      title,
      description,
      url: '/mints',
      type: 'website',
      images: [{ url: '/logo.svg' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/logo.svg'],
    },
  };
}

export default function MintsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
