import type { Metadata } from 'next';
import { neon } from '@neondatabase/serverless';
import { getCategories } from '@/lib/actions/category-actions';

const sql = neon(process.env.DATABASE_URL!);

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const raw = username;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);

  let user: { username?: string; display_name?: string; bio?: string; profile_image_url?: string } | null = null;
  try {
    if (isUUID) {
      const rows = await sql`SELECT username, display_name, bio, profile_image_url FROM users WHERE id = ${raw} LIMIT 1`;
      user = rows[0] || null;
    } else {
      const rows = await sql`SELECT username, display_name, bio, profile_image_url FROM users WHERE LOWER(username) = LOWER(${raw}) LIMIT 1`;
      user = rows[0] || null;
    }
  } catch {}

  // Build fallback teams list
  let teamsList = '';
  try {
    const categories = await getCategories();
    if (categories?.length) {
      teamsList = categories.map(c => c.name).join(', ');
    }
  } catch {}

  const display = user?.display_name?.trim() || user?.username || raw;
  const title = `CARDS DO FUTEBOL de ${display}`;
  const description = (user?.bio && user.bio.trim())
    ? user.bio.trim()!
    : (teamsList
        ? `Veja todos os CARDS DO FUTEBOL dos times: ${teamsList}.`
        : 'Veja todos os CARDS DO FUTEBOL disponíveis.');

  const image = user?.profile_image_url || '/logo.svg';

  return {
    title,
    description,
    alternates: { canonical: `/${user?.username || raw}` },
    openGraph: {
      title,
      description,
      url: `/${user?.username || raw}`,
      type: 'profile',
      images: [{ url: image }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
