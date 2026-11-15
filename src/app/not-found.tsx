import Link from "next/link";

/**
 * 404. The data-not-found marker lets scripts/prune-export.ts delete pages that a
 * disabled feature rendered as "not found" (e.g. /resume with no public resume),
 * so the web server returns a real 404 for them.
 */
export default function NotFound() {
  return (
    <main className="container-site py-24" data-not-found="">
      <p className="label text-accent">404</p>
      <h1 className="mt-3 text-h2">This page isn’t here.</h1>
      <p className="mt-4 text-fg-muted">It may have moved, or it was never published.</p>
      <p className="mt-8">
        <Link href="/" className="text-accent hover:underline">
          <span aria-hidden="true">←</span> Back to the home page
        </Link>
      </p>
    </main>
  );
}
