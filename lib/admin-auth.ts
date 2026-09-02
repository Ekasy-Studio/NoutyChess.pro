import { env } from 'cloudflare:workers';

import { getChatGPTUser, type ChatGPTUser } from '@/app/chatgpt-auth';

type AdminRuntimeEnv = typeof env & {
  NOUTY_ADMIN_EMAILS?: string;
  NOUTY_ADMIN_USER_IDS?: string;
};

function parseAllowlist(value: string | undefined): Set<string> {
  return new Set((value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean));
}

export async function requireAdmin(): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (!user) throw new AdminAccessError(401, 'Entre com sua conta para acessar a administração.');

  const runtimeEnv = env as AdminRuntimeEnv;
  const allowedEmails = parseAllowlist(runtimeEnv.NOUTY_ADMIN_EMAILS);
  if (allowedEmails.size === 0) throw new AdminAccessError(503, 'A administração ainda não foi configurada.');
  if (!allowedEmails.has(user.email.trim().toLowerCase())) throw new AdminAccessError(403, 'Esta conta não está autorizada como administradora.');

  // Camada opcional mais forte: quando configurada, a conta precisa corresponder
  // simultaneamente ao e-mail permitido e ao ID autenticado do ChatGPT.
  const allowedUserIds = parseAllowlist(runtimeEnv.NOUTY_ADMIN_USER_IDS);
  if (allowedUserIds.size > 0 && !allowedUserIds.has(user.userId.trim().toLowerCase())) {
    throw new AdminAccessError(403, 'Esta identidade não está autorizada como administradora.');
  }

  return user;
}

export function requireSameOriginAdminMutation(request: Request): void {
  const origin = request.headers.get('origin');
  const requestOrigin = new URL(request.url).origin;
  const fetchSite = request.headers.get('sec-fetch-site');
  const contentType = request.headers.get('content-type') ?? '';

  if (!origin || origin !== requestOrigin) throw new AdminAccessError(403, 'Origem administrativa inválida.');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') throw new AdminAccessError(403, 'Requisição administrativa externa bloqueada.');
  if (!contentType.toLowerCase().startsWith('application/json')) throw new AdminAccessError(415, 'Formato administrativo inválido.');
}

export class AdminAccessError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'AdminAccessError';
  }
}