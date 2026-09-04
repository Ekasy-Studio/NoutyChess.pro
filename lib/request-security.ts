export class RequestSecurityError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'RequestSecurityError';
  }
}

export function requireSameOriginJsonMutation(request: Request): void {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new RequestSecurityError(415, 'Formato de requisição inválido.');
  }

  const origin = request.headers.get('origin');
  if (!origin) throw new RequestSecurityError(403, 'Origem da requisição ausente.');

  let requestOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    throw new RequestSecurityError(403, 'Origem da requisição inválida.');
  }

  if (origin !== requestOrigin) {
    throw new RequestSecurityError(403, 'Requisição externa bloqueada.');
  }

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
    throw new RequestSecurityError(403, 'Requisição externa bloqueada.');
  }
}
