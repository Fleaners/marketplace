type Props = {
  params: { slug: string };
};

export function generateStaticParams() {
  return [
    { slug: 'northline-industrial-supply' },
    { slug: 'prime-electrical-traders' },
    { slug: 'metro-cables-and-components' },
  ];
}

export default function BusinessProfilePage({ params }: Props) {
  const display = decodeURIComponent(params.slug || '').replace(/-/g, ' ');

  return (
    <main className="container">
      <section className="hero">
        <h1>{display || 'Business'} profile</h1>
        <p className="muted">LinkedIn-meets-marketplace trust page template for phased migration.</p>
      </section>

      <section className="grid">
        <article className="card">
          <h2>Trust and Verification</h2>
          <p>GST verification, response score, years in operation, inquiry handling.</p>
        </article>
        <article className="card">
          <h2>Business Story</h2>
          <p>Human profile focused on reliability, quality, and long-term buyer relationships.</p>
        </article>
        <article className="card">
          <h2>Certifications</h2>
          <p>ISO, GST, and category-specific approvals.</p>
        </article>
        <article className="card">
          <h2>Social Presence</h2>
          <p>Website, LinkedIn, and support channels.</p>
        </article>
      </section>
    </main>
  );
}
