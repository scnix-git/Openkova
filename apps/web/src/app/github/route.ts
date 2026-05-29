import { redirect } from 'next/navigation';

export function GET() {
  redirect(process.env['OPENKOVA_GITHUB_URL'] ?? 'https://github.com/scnix-git/openkova');
}
