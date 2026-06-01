'use client';

export interface LogLine {
  message: string;
  status: 'progress' | 'done' | 'error';
}

interface Props {
  lines: LogLine[];
  running: boolean;
}

export default function Terminal({ lines, running }: Props) {
  if (lines.length === 0 && !running) return null;

  return (
    <div className="terminal">
      <div className="terminal__bar">
        <span className="terminal__name">openkova</span>
      </div>
      <div className="terminal__body">
        {lines.map((line, i) => (
          <div key={i} className={`terminal__line terminal__line--${line.status}`}>
            <span className="terminal__prompt">&gt;</span>
            <span>{line.message}</span>
          </div>
        ))}
        {running && (
          <div className="terminal__line terminal__line--progress">
            <span className="terminal__cursor">▌</span>
          </div>
        )}
      </div>
    </div>
  );
}
