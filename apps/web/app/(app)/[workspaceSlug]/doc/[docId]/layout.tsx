import type { Metadata } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface Props {
  params: Promise<{ workspaceSlug: string; docId: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspaceSlug, docId } = await params;

  try {
    const res = await fetch(`${API_BASE}/workspaces/${workspaceSlug}/documents/${docId}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return { title: '문서' };
    }

    const data = (await res.json()) as {
      document: { title: string; content: string; slug: string };
    };

    const doc = data.document;
    const description = doc.content
      .replace(/[#*`>\-[\]()!]/g, '')
      .slice(0, 155)
      .trim() || '문서 내용이 없습니다.';

    return {
      title: doc.title,
      description,
      openGraph: {
        title: doc.title,
        description,
        type: 'article',
      },
    };
  } catch {
    return { title: '문서' };
  }
}

export default function DocLayout({ children }: Props) {
  return <>{children}</>;
}
