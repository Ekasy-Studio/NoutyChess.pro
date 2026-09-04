import { describe, expect, it } from 'vitest';

import { RequestSecurityError, requireSameOriginJsonMutation } from '../lib/request-security';

function request(origin: string | null, contentType = 'application/json', fetchSite: string | null = 'same-origin') {
  const headers = new Headers();
  if (origin) headers.set('origin', origin);
  if (contentType) headers.set('content-type', contentType);
  if (fetchSite) headers.set('sec-fetch-site', fetchSite);
  return new Request('https://noutychess.pro/api/test', { method: 'POST', headers, body: '{}' });
}

describe('segurança de mutações HTTP', () => {
  it('permite JSON vindo da própria origem', () => {
    expect(() => requireSameOriginJsonMutation(request('https://noutychess.pro'))).not.toThrow();
  });

  it('bloqueia origem externa', () => {
    expect(() => requireSameOriginJsonMutation(request('https://evil.example'))).toThrow(RequestSecurityError);
  });

  it('bloqueia requisição sem Origin', () => {
    expect(() => requireSameOriginJsonMutation(request(null))).toThrow(/Origem/);
  });

  it('bloqueia formato diferente de JSON', () => {
    expect(() => requireSameOriginJsonMutation(request('https://noutychess.pro', 'text/plain'))).toThrow(/Formato/);
  });

  it('bloqueia Sec-Fetch-Site externo mesmo quando Origin foi forjado igual', () => {
    expect(() => requireSameOriginJsonMutation(request('https://noutychess.pro', 'application/json', 'cross-site'))).toThrow(/externa/);
  });
});
