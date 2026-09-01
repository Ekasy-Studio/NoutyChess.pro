import { env } from 'cloudflare:workers';

import { getChatGPTUser, type ChatGPTUser } from '@/app/chatgpt-auth';

export async function requireAdmin(): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (!user) throw new AdminAccessError(401, 'Entre com sua conta para acessar a administração.');
  const allowed = (env.NOUTY_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.includes(user.email.toLowerCase())) throw new AdminAccessError(403, 'Esta conta não está autorizada como administradora.');
  return user;
}

export class AdminAccessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
