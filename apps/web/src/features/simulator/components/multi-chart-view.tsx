import React, { useMemo } from 'react';
import { Plus, X, Layers } from 'lucide-react';
import type { ChartBar } from '../../../core/simulator/chart-data';
import { resampleBars } from '../../../core/simulator/chart-data';
import type { ChartIndicatorSpec } from '../../../core/simulator/chart-series';
import type { TradeMarker, RoundTrip } from '../../../core/simulator/trade-pairing';
import { InteractiveChart } from './interactive-chart';

export interface SecondaryChartConfig {
  id: string;
  timeframe: string;
}

export interface MultiChartViewProps {
  bars: readonly ChartBar[];
  indicators: readonly ChartIndicatorSpec[];
  markers: readonly TradeMarker[];
  trips: readonly RoundTrip[];
  seriesKey: string;
  instrumentId: string;
  primaryTimeframe: string;
  secondaryCharts: SecondaryChartConfig[];
  onAddChart?: (tf?: string) => void;
  onRemoveChart?: (id: string) => void;
  onChangeTimeframe?: (id: string, tf: string) => void;
  syncEnabled?: boolean;
  onToggleSync?: (enabled: boolean) => void;
  isReplaying?: boolean;
}

const TIMEFRAMES_OPTIONS = [
  '1m',
  '3m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '1d',
  '1w',
  '1mo',
];

export const MultiChartView: React.FC<MultiChartViewProps> = ({
  bars,
  indicators,
  markers,
  trips,
  seriesKey,
  instrumentId,
  primaryTimeframe,
  secondaryCharts = [],
  onAddChart,
  onRemoveChart,
  onChangeTimeframe,
  syncEnabled = true,
  onToggleSync,
  isReplaying = false,
}) => {
  const hasMultiple = secondaryCharts.length > 0;

  // Single chart view
  if (!hasMultiple) {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <InteractiveChart
          bars={bars}
          indicators={indicators}
          markers={markers}
          trips={trips}
          seriesKey={seriesKey}
          isReplaying={isReplaying}
        />
      </div>
    );
  }

  // Multi chart grid view
  const gridTemplate =
    secondaryCharts.length === 1
      ? '1fr 1fr'
      : secondaryCharts.length === 2
      ? '1fr 1fr 1fr'
      : 'repeat(auto-fit, minmax(360px, 1fr))';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        gridTemplateColumns: gridTemplate,
        gap: 2,
        background: 'var(--border-subtle)',
        position: 'relative',
      }}
    >
      {/* Primary Driving Timeframe Chart */}
      <div style={{ position: 'relative', height: '100%', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--accent-primary)',
            background: 'var(--bg-surface-elevated)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Primary: {instrumentId || 'TCS.NSE'}</span>
            <span
              style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 3,
                background: 'var(--accent-subtle, rgba(41,98,255,0.15))',
                color: 'var(--accent-primary)',
              }}
            >
              {primaryTimeframe}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({bars.length} bars)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onToggleSync && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10,
                  cursor: 'pointer',
                  color: syncEnabled ? 'var(--bullish, #089981)' : 'var(--text-muted)',
                }}
                title="Synchronize bars and replay stepping across all charts"
              >
                <input
                  type="checkbox"
                  checked={syncEnabled}
                  onChange={(e) => onToggleSync(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <Layers size={11} />
                <span>Sync</span>
              </label>
            )}
            {secondaryCharts.length < 3 && onAddChart && (
              <button
                type="button"
                className="shortlist-btn"
                onClick={() => onAddChart()}
                style={{ fontSize: 10, padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3 }}
                title="Add another timeframe chart"
              >
                <Plus size={10} />
                <span>Add Chart</span>
              </button>
            )}
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <InteractiveChart
            bars={bars}
            indicators={indicators}
            markers={markers}
            trips={trips}
            seriesKey={`${seriesKey}|primary`}
            isReplaying={isReplaying}
          />
        </div>
      </div>

      {/* Secondary Timeframe Charts */}
      {secondaryCharts.map((cfg, index) => {
        return (
          <SecondaryChartPane
            key={cfg.id}
            chartIndex={index + 2}
            config={cfg}
            bars={bars}
            indicators={indicators}
            markers={markers}
            trips={trips}
            seriesKey={seriesKey}
            instrumentId={instrumentId}
            onRemove={() => onRemoveChart?.(cfg.id)}
            onChangeTimeframe={(tf) => onChangeTimeframe?.(cfg.id, tf)}
            isReplaying={syncEnabled ? isReplaying : false}
          />
        );
      })}
    </div>
  );
};

const SecondaryChartPane: React.FC<{
  chartIndex: number;
  config: SecondaryChartConfig;
  bars: readonly ChartBar[];
  indicators: readonly ChartIndicatorSpec[];
  markers: readonly TradeMarker[];
  trips: readonly RoundTrip[];
  seriesKey: string;
  instrumentId: string;
  onRemove: () => void;
  onChangeTimeframe: (tf: string) => void;
  isReplaying: boolean;
}> = ({
  chartIndex,
  config,
  bars,
  indicators,
  markers,
  trips,
  seriesKey,
  instrumentId,
  onRemove,
  onChangeTimeframe,
  isReplaying,
}) => {
  const secondaryBars = useMemo(() => {
    if (bars.length === 0) return [];
    return resampleBars(bars, config.timeframe);
  }, [bars, config.timeframe]);

  return (
    <div style={{ position: 'relative', height: '100%', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--accent-gold, #f7a600)',
          background: 'var(--bg-surface-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Chart {chartIndex}: {instrumentId || 'TCS.NSE'}</span>
          <select
            value={config.timeframe}
            onChange={(e) => onChangeTimeframe(e.target.value)}
            style={{
              fontSize: 10,
              padding: '1px 4px',
              borderRadius: 3,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
            title="Select timeframe for this chart"
          >
            {TIMEFRAMES_OPTIONS.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({secondaryBars.length} bars)</span>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="shortlist-btn"
          style={{
            padding: '2px 4px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Remove this chart"
        >
          <X size={12} />
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <InteractiveChart
          bars={secondaryBars}
          indicators={indicators}
          markers={markers}
          trips={trips}
          seriesKey={`${seriesKey}|secondary|${config.id}|${config.timeframe}`}
          showVolume={false}
          isReplaying={isReplaying}
        />
      </div>
    </div>
  );
};
