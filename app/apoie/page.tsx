import { ensureSchema, getD1 } from '@/db';
import { SupportPage } from './support-page';

export const dynamic = 'force-dynamic';

export default async function ApoiePage() {
  let pixKey = '';
  try {
    await ensureSchema();
    const setting = await getD1().prepare("SELECT value FROM app_settings WHERE key = 'pix_key'").first<{ value: string }>();
    pixKey = setting?.value ?? '';
  } catch {
    // The support page remains visible if persistence is temporarily unavailable.
  }
  return <SupportPage pixKey={pixKey} />;
}
