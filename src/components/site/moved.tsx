/**
 * Fallback for old URLs. The web server should answer with a 301 (see deploy/);
 * when it doesn't, this meta refresh (hoisted into <head> by React) still moves the visitor.
 */
export function Moved({ to }: { to: string }) {
  return (
    <main className="container-site py-24">
      <meta httpEquiv="refresh" content={`0; url=${to}`} />
      <link rel="canonical" href={to} />
      <meta name="robots" content="noindex" />
      <p>
        This page has moved to <a href={to} className="text-accent underline">{to}</a>.
      </p>
    </main>
  );
}
