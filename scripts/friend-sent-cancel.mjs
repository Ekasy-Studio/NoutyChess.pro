import fs from 'node:fs';

const componentPath = 'components/nouty-chess-game.tsx';
const cssPath = 'app/enhancements.css';
let component = fs.readFileSync(componentPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');

const before = `      {data.sent.length > 0 && <small className="friend-pending">Aguardando: {data.sent.map((item) => item.display_name).join(', ')}</small>}`;
const after = `      {data.sent.length > 0 && <div className="friend-pending-list"><small>Solicitações enviadas</small>{data.sent.map((item) => <div key={item.pair_key}><span>{item.display_name}</span><button type="button" disabled={Boolean(busy)} onClick={() => void act('remove', { pairKey: item.pair_key })}>Cancelar</button></div>)}</div>}`;

if (!component.includes(before)) throw new Error('Lista de solicitações enviadas esperada não foi encontrada.');
component = component.replace(before, after);

const marker = '/* Sent friend requests can be cancelled individually. */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n.friend-pending-list { display: grid; gap: .3rem; padding: 0 .65rem .65rem; }\n.friend-pending-list > small { color: var(--muted-foreground); font-size: .48rem; }\n.friend-pending-list > div { display: flex; align-items: center; justify-content: space-between; gap: .5rem; min-height: 1.9rem; padding: .3rem .45rem; border: 1px solid rgba(255,255,255,.06); border-radius: .55rem; background: rgba(255,255,255,.02); }\n.friend-pending-list span { min-width: 0; overflow: hidden; font-size: .54rem; text-overflow: ellipsis; white-space: nowrap; }\n.friend-pending-list button { flex: 0 0 auto; color: var(--muted-foreground); font-size: .46rem; text-decoration: underline; }\n.friend-pending-list button:disabled { opacity: .5; }\n`;
}

fs.writeFileSync(componentPath, component);
fs.writeFileSync(cssPath, css);
console.log('Sent friend request cancellation UI applied.');
