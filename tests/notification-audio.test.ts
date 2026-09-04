import { describe, expect, it } from 'vitest';

import { mergeNotificationIds, newUnreadGameInviteIds } from '../lib/notification-audio';

describe('som de notificações', () => {
  it('detecta somente convite novo e não lido', () => {
    const known = new Set(['old']);
    const items = [
      { id: 'old', kind: 'game-invite', read_at: null },
      { id: 'new-invite', kind: 'game-invite', read_at: null },
      { id: 'friend', kind: 'friendship', read_at: null },
      { id: 'read-invite', kind: 'game-invite', read_at: 123 },
    ];

    expect(newUnreadGameInviteIds(items, known)).toEqual(['new-invite']);
  });

  it('não repete som depois que os ids foram conhecidos', () => {
    const items = [{ id: 'invite-1', kind: 'game-invite', read_at: null }];
    const known = mergeNotificationIds(new Set<string>(), items);

    expect(newUnreadGameInviteIds(items, known)).toEqual([]);
  });

  it('preserva ids anteriores ao incorporar nova carga', () => {
    const known = mergeNotificationIds(new Set(['a']), [{ id: 'b' }, { id: 'c' }]);
    expect([...known].sort()).toEqual(['a', 'b', 'c']);
  });
});
