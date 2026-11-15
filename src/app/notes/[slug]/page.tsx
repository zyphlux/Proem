import { getContent } from "@/content/load";
import { markdownToHTML } from "@/lib/markdown";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamicParams = false;

export function generateStaticParams() {
  const notes = getContent().notes;
  // Static export needs at least one param; a placeholder renders a 404 that the prune step removes.
  return notes.length ? notes.map((n) => ({ slug: n.slug })) : [{ slug: "_none" }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const n = getContent().notes.find((x) => x.slug === slug);
  return n ? { title: n.title, description: n.summary } : {};
}

export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const n = getContent().notes.find((x) => x.slug === slug);
  if (!n) notFound();
  const html = await markdownToHTML(n.body);

  return (
    <main className="container-site pb-10">
      <p className="pt-10">
        <Link href="/notes/" className="label text-fg-muted hover:text-fg">
          <span aria-hidden="true">←</span> Notes
        </Link>
      </p>
      <header className="max-w-[68ch] pt-6 pb-8">
        <h1 className="text-h2">{n.title}</h1>
        <p className="label mt-4 text-[11px] text-fg-muted">
          <time dateTime={n.date}>{n.date}</time>
          {n.tags.length > 0 && ` · ${n.tags.join(" · ")}`}
        </p>
      </header>
      <article className="prose prose-site border-t pt-8" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
