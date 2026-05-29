import { cookies } from 'next/headers';
import ConverterTabs from '@/components/ConverterTabs';

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('openkova_session')?.value ?? null;

  return (
    <main className="page">
      <h1 className="page__title">HTML to Image</h1>
      <p className="page__subtitle">
        Convert HTML snippets, files, or websites to screenshots — instantly.
      </p>
      <ConverterTabs initialSessionId={sessionId} />
    </main>
  );
}
