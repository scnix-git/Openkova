import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';

export const metadata: Metadata = {
  metadataBase: new URL('https://openkova.up.railway.app'),
  title: {
    default: 'Openkova — Free HTML to PNG Screenshot Tool',
    template: '%s — Openkova',
  },
  description:
    'Convert HTML snippets, uploaded files, or any website URL to pixel-accurate PNG screenshots. Free, open-source, powered by Puppeteer and headless Chromium.',
  keywords: [
    'html to image',
    'html to png',
    'html screenshot',
    'webpage screenshot',
    'screenshot api',
    'puppeteer screenshot',
    'open source screenshot tool',
    'url to image',
    'html to png api',
    'web screenshot tool',
  ],
  authors: [{ name: 'Openkova' }],
  creator: 'Openkova',
  openGraph: {
    type: 'website',
    url: 'https://openkova.up.railway.app',
    title: 'Openkova — Free HTML to PNG Screenshot Tool',
    description:
      'Convert HTML snippets, uploaded files, or any website URL to pixel-accurate PNG screenshots. Free, open-source, powered by Puppeteer and headless Chromium.',
    siteName: 'Openkova',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Openkova — Free HTML to PNG Screenshot Tool',
    description:
      'Convert HTML snippets, uploaded files, or any website URL to pixel-accurate PNG screenshots. Free, open-source.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: 'https://openkova.up.railway.app',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
