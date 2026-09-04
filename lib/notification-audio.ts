export type NotificationAudioItem = {
  id: string;
  kind: string;
  read_at: number | null;
};

export function newUnreadGameInviteIds(
  items: readonly NotificationAudioItem[],
  knownIds: ReadonlySet<string>,
): string[] {
  return items
    .filter((item) => item.kind === 'game-invite' && item.read_at === null && !knownIds.has(item.id))
    .map((item) => item.id);
}

export function mergeNotificationIds(
  current: ReadonlySet<string>,
  items: readonly Pick<NotificationAudioItem, 'id'>[],
): Set<string> {
  const next = new Set(current);
  for (const item of items) next.add(item.id);
  return next;
}
