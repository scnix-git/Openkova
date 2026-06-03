import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: {
    default: 'Openkova — HTML to Image',
    template: '%s — Openkova',
  },
  description:
    'Convert HTML snippets, uploaded files, or any website URL to pixel-accurate PNG screenshots. Open-source, powered by Puppeteer and headless Chromium.',
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
