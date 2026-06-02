import { cookies } from 'next/headers';
import ConverterTabs from '@/components/ConverterTabs';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Openkova',
  url: 'https://openkova.up.railway.app',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any',
  description:
    'Convert HTML snippets, uploaded files, or any website URL to pixel-accurate PNG screenshots. Free, open-source, powered by Puppeteer and headless Chromium.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  featureList: [
    'HTML snippet to PNG',
    'HTML file upload to PNG',
    'URL / website screenshot',
    'Full-page capture',
    'Multiple viewport sizes',
    'Bulk ZIP download',
    'Server-Sent Events streaming progress',
  ],
};

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('openkova_session')?.value ?? null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="page">
        <h1 className="page__title">HTML to Image</h1>
        <p className="page__subtitle">
          Convert HTML snippets, files, or websites to screenshots — instantly.
        </p>
        <ConverterTabs initialSessionId={sessionId} />
      </main>
    </>
  );
}
