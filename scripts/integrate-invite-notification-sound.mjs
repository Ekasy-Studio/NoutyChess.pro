import fs from 'node:fs';

const path = 'components/nouty-chess-game.tsx';
let source = fs.readFileSync(path, 'utf8');

function replaceOnce(before, after, label) {
  if (!source.includes(before)) throw new Error(`Trecho esperado não encontrado: ${label}`);
  source = source.replace(before, after);
}

replaceOnce(
  "import { createOnlineSyncPayload, restoreOnlineSyncPayload } from '@/lib/online-sync';\n",
  "import { createOnlineSyncPayload, restoreOnlineSyncPayload } from '@/lib/online-sync';\nimport { mergeNotificationIds, newUnreadGameInviteIds } from '@/lib/notification-audio';\n",
  'import notification audio',
);

replaceOnce(
  '{competitiveProfile && <NotificationsMenu />}',
  '{competitiveProfile && <NotificationsMenu onSound={playGameSound} />}',
  'callback do menu de notificações',
);

const oldBlock = `type NotificationItem = { id: string; kind: string; title: string; message: string; created_at: number; read_at: number | null };
function NotificationsMenu() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      const body = await response.json() as { notifications?: NotificationItem[]; unread?: number };
      if (response.ok) {
        setItems(body.notifications ?? []);
        setUnread(Number(body.unread ?? 0));
      }
    } catch {
      // Notifications are non-blocking.
    }
  }, []);`;

const newBlock = `type NotificationItem = { id: string; kind: string; title: string; message: string; created_at: number; read_at: number | null };
function NotificationsMenu({ onSound }: { onSound: (event: GameSoundEvent) => void }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const initializedRef = useRef(false);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      const body = await response.json() as { notifications?: NotificationItem[]; unread?: number };
      if (response.ok) {
        const notifications = body.notifications ?? [];
        if (initializedRef.current && newUnreadGameInviteIds(notifications, knownIdsRef.current).length > 0) {
          onSound('invite');
        }
        knownIdsRef.current = mergeNotificationIds(knownIdsRef.current, notifications);
        initializedRef.current = true;
        setItems(notifications);
        setUnread(Number(body.unread ?? 0));
      }
    } catch {
      // Notifications are non-blocking.
    }
  }, [onSound]);`;

replaceOnce(oldBlock, newBlock, 'carregamento das notificações');

fs.writeFileSync(path, source);
console.log('Invite notification sound integrated.');
