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

  const title = 'Coleção digital – veja todos os CARDS DO FUTEBOL disponíveis';
  const description = teamsList
    ? `Coleção digital: veja todos os CARDS DO FUTEBOL disponíveis. Times: ${teamsList}.`
    : 'Coleção digital: veja todos os CARDS DO FUTEBOL disponíveis.';

  return {
    title,
    description,
    alternates: { canonical: '/cards' },
    openGraph: {
      title,
      description,
      url: '/cards',
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

export default function CardsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
