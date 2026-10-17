// Ported/modernized from bfx-hf-ui-core's src/ui/ProgressBar (Apache-2.0).
// The original rendered `rc-progress`'s <Line> colored from a Redux theme selector; replaced
// with a plain CSS bar driven by the shared design tokens (no theme store dependency needed).
import './ProgressBar.css';

export interface ProgressBarProps {
  percent: number;
  showPercent?: boolean;
}

export function ProgressBar({ percent, showPercent = false }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className="hb-progress-bar">
      <div
        className="hb-progress-bar__track"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="hb-progress-bar__fill" style={{ width: `${clamped}%` }} />
      </div>
      {showPercent && <p className="hb-progress-bar__percent">{`${percent}%`}</p>}
    </div>
  );
}
