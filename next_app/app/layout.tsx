import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Marketplace Seller Central',
  description: 'Enterprise-grade marketplace with Standard and Premium seller plans, unlimited listings, rich profiles, and advanced analytics.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
