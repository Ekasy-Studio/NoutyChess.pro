import { readFile, writeFile } from 'node:fs/promises';

const path = 'components/nouty-chess-game.tsx';
let source = await readFile(path, 'utf8');

function replaceOnce(search, replacement, label) {
  const first = source.indexOf(search);
  if (first < 0) throw new Error(`Padrão não encontrado: ${label}`);
  if (source.indexOf(search, first + search.length) >= 0) throw new Error(`Padrão duplicado inesperado: ${label}`);
  source = source.replace(search, replacement);
}

replaceOnce(
  "  const [audioEnabled, setAudioEnabled] = useState(true);\n",
  "  const [audioEnabled, setAudioEnabled] = useState(true);\n  const [audioVolume, setAudioVolume] = useState(0.65);\n",
  'estado de áudio',
);

replaceOnce(
  "        gain.gain.exponentialRampToValueAtTime(0.045, start + 0.012);\n",
  "        gain.gain.exponentialRampToValueAtTime(Math.max(0.002, 0.045 * audioVolume), start + 0.012);\n",
  'ganho do som',
);

replaceOnce(
  "  }, [audioEnabled]);\n",
  "  }, [audioEnabled, audioVolume]);\n",
  'dependência de áudio',
);

replaceOnce(
  "        if (typeof stored.audioEnabled === 'boolean') setAudioEnabled(stored.audioEnabled);\n",
  "        if (typeof stored.audioEnabled === 'boolean') setAudioEnabled(stored.audioEnabled);\n        if (typeof stored.audioVolume === 'number' && Number.isFinite(stored.audioVolume)) setAudioVolume(Math.max(0.1, Math.min(1, stored.audioVolume)));\n",
  'carregamento do volume',
);

replaceOnce(
  "    localStorage.setItem('noutychess-preferences-v1', JSON.stringify({ difficulty, teacher, timeControl, audioEnabled, showLegalMoves, showCoordinates, showLastMove, showThreats, beginnerGuide, alertsEnabled, animationsEnabled, guestName }));\n",
  "    localStorage.setItem('noutychess-preferences-v1', JSON.stringify({ difficulty, teacher, timeControl, audioEnabled, audioVolume, showLegalMoves, showCoordinates, showLastMove, showThreats, beginnerGuide, alertsEnabled, animationsEnabled, guestName }));\n",
  'persistência do volume',
);

replaceOnce(
  "  }, [alertsEnabled, animationsEnabled, audioEnabled, beginnerGuide, difficulty, guestName, showCoordinates, showLastMove, showLegalMoves, showThreats, teacher, timeControl]);\n",
  "  }, [alertsEnabled, animationsEnabled, audioEnabled, audioVolume, beginnerGuide, difficulty, guestName, showCoordinates, showLastMove, showLegalMoves, showThreats, teacher, timeControl]);\n",
  'dependências da persistência',
);

replaceOnce(
  "                    audioEnabled={audioEnabled}\n                    setAudioEnabled={setAudioEnabled}\n",
  "                    audioEnabled={audioEnabled}\n                    setAudioEnabled={setAudioEnabled}\n                    audioVolume={audioVolume}\n                    setAudioVolume={setAudioVolume}\n",
  'props do volume',
);

replaceOnce(
  "  audioEnabled: boolean; setAudioEnabled: (value: boolean) => void;\n",
  "  audioEnabled: boolean; setAudioEnabled: (value: boolean) => void;\n  audioVolume: number; setAudioVolume: (value: number) => void;\n",
  'tipo das props de volume',
);

replaceOnce(
  "      <div className=\"game-preferences-body\">{rows.map(([label, enabled, setter, icon]) => <div className=\"preference-row\" key={label}><span>{icon} {label}</span><button type=\"button\" className={enabled ? 'is-on' : ''} onClick={() => setter(!enabled)}>{enabled ? 'Ligado' : 'Desligado'}</button></div>)}</div>\n",
  "      <div className=\"game-preferences-body\">\n        <label className=\"preference-volume\"><span>Volume</span><input type=\"range\" min=\"10\" max=\"100\" step=\"5\" value={Math.round(props.audioVolume * 100)} onChange={(event) => props.setAudioVolume(Math.max(0.1, Math.min(1, Number(event.target.value) / 100)))} /><output>{Math.round(props.audioVolume * 100)}%</output></label>\n        {rows.map(([label, enabled, setter, icon]) => <div className=\"preference-row\" key={label}><span>{icon} {label}</span><button type=\"button\" className={enabled ? 'is-on' : ''} onClick={() => setter(!enabled)}>{enabled ? 'Ligado' : 'Desligado'}</button></div>)}\n      </div>\n",
  'controle visual de volume',
);

await writeFile(path, source, 'utf8');
console.log('Controle de volume persistente aplicado.');
