// docs/tasks.md Batch C is explicit that this does NOT port bfx-hf-ui-core's own
// `Chart`/`ChartPanel` (src/components/{Chart,ChartPanel}) — that pair renders candles through
// an embedded Bitfinex TradingView iframe (`useChartIframe`), which has no honba equivalent and
// isn't worth porting now that honba already has a proven, zero-dep, NSE/BSE-aware charting
// engine (`openalgo-charts`, used today in
// honba-frontend/src/components/features/workbench/openalgo-chart.tsx). This is a thin,
// from-scratch wrapper around `openalgo-charts`' widget tier; bfx-hf-ui-core's `ChartPanel.js`
// was read only for layout/toolbar UX reference (timeframe switcher placement, fullscreen
// toggle, symbol label in the panel header — see the header/labels below) and none of its code
// is reused.
//
// Like every other `ui-core` component, this is props-in / no-fetching: the caller supplies a
// `DataFeed` (honba's own feed adapter over `/quotes`, `/ws`, etc. — see
// honba-frontend's `openalgo-feed.ts` for the proven shape) and owns `symbol`/`timeframe` as
// controlled state; `ChartPanel` only drives the underlying `openalgo-charts` widget from those
// props and reports user-initiated changes back out through callbacks.
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { DataFeed } from 'openalgo-charts';
import { createWidget } from 'openalgo-charts/widget';
import type { Widget, WidgetThemeName } from 'openalgo-charts/widget';
import { Maximize2, Minimize2 } from 'lucide-react';
import clsx from 'clsx';

import { Panel } from '../../ui/Panel';
import { TimeFrameDropdown, DEFAULT_TIMEFRAMES } from '../TimeFrameDropdown';
import './ChartPanel.css';

export interface ChartPanelProps {
  symbol: string;
  exchange?: string;
  /** Controlled timeframe code (e.g. `1m`/`1h`/`1d`) — the caller owns this as state. */
  timeframe: string;
  /** Timeframe codes offered in the switcher. Defaults to `TimeFrameDropdown`'s own default list. */
  timeframes?: readonly string[];
  /** Bar/history/live-tick source; see `openalgo-charts`' `DataFeed` interface. */
  feed: DataFeed;
  theme?: WidgetThemeName;
  /** Panel header label; defaults to the symbol. */
  label?: ReactNode;
  onTimeframeChange?: (timeframe: string) => void;
  onSymbolChange?: (symbol: string) => void;
  removeable?: boolean;
  onRemove?: () => void;
  className?: string;
}

export function ChartPanel({
  symbol,
  exchange = '',
  timeframe,
  timeframes = DEFAULT_TIMEFRAMES,
  feed,
  theme = 'dark',
  label,
  onTimeframeChange,
  onSymbolChange,
  removeable = false,
  onRemove,
  className,
}: ChartPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<Widget | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Build the widget once per feed instance. symbol/timeframe/theme changes below drive the
  // live widget (setSymbol/setInterval/setTheme) instead of tearing it down and rebuilding it.
  useEffect(() => {
    if (!hostRef.current) return undefined;

    const widget = createWidget(hostRef.current, {
      feed,
      symbol,
      exchange,
      interval: timeframe,
      theme,
      topbar: false,
      rail: false,
      statusline: true,
      panels: false,
    });
    widgetRef.current = widget;

    const offSymbol = widget.on('symbol', (evt) => {
      if (evt?.symbol) onSymbolChange?.(evt.symbol);
    });
    const offInterval = widget.on('interval', (evt) => {
      if (evt?.interval) onTimeframeChange?.(evt.interval);
    });

    return () => {
      offSymbol();
      offInterval();
      widget.destroy();
      widgetRef.current = null;
    };
    // Intentionally scoped to `feed` only — see comment above the effect.
  }, [feed]);

  useEffect(() => {
    const widget = widgetRef.current;
    if (widget && !widget.isDestroyed && widget.symbol().toUpperCase() !== symbol.toUpperCase()) {
      widget.setSymbol(symbol, exchange);
    }
  }, [symbol, exchange]);

  useEffect(() => {
    const widget = widgetRef.current;
    if (widget && !widget.isDestroyed && widget.interval() !== timeframe) {
      widget.setInterval(timeframe);
    }
  }, [timeframe]);

  useEffect(() => {
    const widget = widgetRef.current;
    if (widget && !widget.isDestroyed) {
      widget.setTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
      return;
    }
    if (typeof el.requestFullscreen === 'function') {
      el.requestFullscreen().catch(() => {});
    }
  };

  return (
    <Panel
      label={label ?? symbol}
      removeable={removeable}
      onRemove={onRemove}
      className={clsx('hb-chart-panel', className)}
      headerComponents={
        <TimeFrameDropdown
          value={timeframe}
          timeframes={timeframes}
          onChange={(next) => onTimeframeChange?.(next)}
        />
      }
      extraIcons={
        <button
          type="button"
          className="hb-chart-panel__fullscreen-button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      }
    >
      <div ref={rootRef} className="hb-chart-panel__root">
        <div ref={hostRef} className="hb-chart-panel__host" data-testid="chart-panel-host" />
      </div>
    </Panel>
  );
}
