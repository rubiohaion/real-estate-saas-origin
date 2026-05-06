import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shamaot',
  description: 'Residential appraisal report management system',
  openGraph: {
    title: 'Shamaot',
    description: 'Residential appraisal report management system',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shamaot',
    description: 'Residential appraisal report management system',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
