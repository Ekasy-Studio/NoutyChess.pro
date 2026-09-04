import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const guardedRoutes = [
  'app/api/chat/route.ts',
  'app/api/coach/route.ts',
  'app/api/competitive/route.ts',
  'app/api/friends/route.ts',
  'app/api/membership/route.ts',
  'app/api/notifications/route.ts',
  'app/api/presence/route.ts',
];

describe('proteção das APIs que alteram estado', () => {
  for (const route of guardedRoutes) {
    it(`${route} exige mesma origem`, () => {
      const source = fs.readFileSync(path.resolve(process.cwd(), route), 'utf8');
      expect(source).toContain('requireSameOriginJsonMutation(request)');
    });
  }

  it('admin mantém proteção específica de mesma origem', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'app/api/admin/route.ts'), 'utf8');
    expect(source).toContain('requireSameOriginAdminMutation(request)');
  });
});
