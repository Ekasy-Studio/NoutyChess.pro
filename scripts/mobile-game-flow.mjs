import fs from 'node:fs';

const componentPath = 'components/nouty-chess-game.tsx';
const cssPath = 'app/enhancements.css';
let component = fs.readFileSync(componentPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');

const before = '      <section className="game-layout">';
const after = `      <section className={\`game-layout \${mode === 'menu'
        ? 'game-layout-menu'
        : mode === 'online' && onlinePhase === 'disconnected'
          ? 'game-layout-reconnect'
          : mode === 'online' && onlinePhase !== 'connected'
            ? 'game-layout-lobby'
            : ''}\`}>`;

if (!component.includes(before)) throw new Error('game-layout esperado não encontrado.');
component = component.replace(before, after);

const marker = '/* Mobile flow: menu and lobby first, board first only during a real game. */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n@media (max-width: 1050px) {\n  .game-layout-menu .game-stage,\n  .game-layout-lobby .game-stage { display: none; }\n\n  .game-layout-menu,\n  .game-layout-lobby { min-height: auto; padding-top: .4rem; }\n\n  .game-layout-reconnect .control-panel { order: -1; }\n}\n\n@media (max-width: 600px) {\n  .app-header {\n    padding-top: max(.65rem, env(safe-area-inset-top));\n    padding-right: max(.75rem, env(safe-area-inset-right));\n    padding-left: max(.75rem, env(safe-area-inset-left));\n  }\n\n  .game-layout-menu,\n  .game-layout-lobby { padding-inline: max(.5rem, env(safe-area-inset-left)); }\n\n  .game-layout-menu .control-panel,\n  .game-layout-lobby .control-panel { width: 100%; }\n\n  .app-credit { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }\n}\n`;
}

fs.writeFileSync(componentPath, component);
fs.writeFileSync(cssPath, css);
console.log('Mobile game flow applied.');
