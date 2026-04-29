import { useEffect, useRef } from 'react';

const BAR_WIDTH   = 24;
const MAX_TOKENS  = 1500;

function buildBar(tokens) {
  const filled = Math.min(BAR_WIDTH, Math.floor((tokens / MAX_TOKENS) * BAR_WIDTH));
  return '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled);
}

function ProgressLine({ step, tokens, tps }) {
  const bar = buildBar(tokens);
  const pct = Math.min(100, Math.round((tokens / MAX_TOKENS) * 100));

  return (
    <div className="t-line t-progress" aria-live="polite">
      <span className="t-bar">[{bar}]</span>
      {' '}
      <span className="t-tps">{tps > 0 ? `${tps.toFixed(1)} tok/s` : '-- tok/s'}</span>
      {' | '}
      <span className="t-tokens">{tokens} tokens</span>
      {' | '}
      <span className="t-pct">{pct}%</span>
    </div>
  );
}

export default function StatusTerminal({ logs, progress, isRunning }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs, progress]);

  return (
    <div className="status-terminal" ref={ref}>
      {logs.map((line, i) => (
        <div key={i} className={`t-line${i === logs.length - 1 && !progress && !isRunning ? ' active' : ''}`}>
          {line}
        </div>
      ))}

      {progress && (
        <ProgressLine step={progress.step} tokens={progress.tokens} tps={progress.tps} />
      )}

      {isRunning && !progress && (
        <span className="t-cursor" aria-hidden="true" />
      )}
    </div>
  );
}
