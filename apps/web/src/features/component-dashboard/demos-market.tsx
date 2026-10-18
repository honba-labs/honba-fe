// Live demos for `ui-core/src/market/*` (Batch C, docs/tasks.md — the order book + chart
// trading-view widgets). Data comes from `fixtures.ts`; the caller-owned controlled state
// (symbol/timeframe) is what honba's features will later wire to /ws + TanStack Query.
// Each demo renders raw content — the dashboard's `DemoTile` provides the framing.
import { useEffect, useState } from 'react';
import { FakeDataFeed } from 'openalgo-charts';
import {
  ChartPanel,
  InstrumentInfoBar,
  MarketSelect,
  OrderBook,
  OrderBookPanel,
  StatusBar,
  TimeFrameDropdown,
} from '@honba/ui-core';
import { orderBookData, marketsFixture } from './fixtures';

function OrderBookPanelDemo() {
  return (
    <div className="demo-row" style={{ alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 320 }}>
        <p className="demo-label">OrderBook (bare)</p>
        <OrderBook
          {...orderBookData}
          onLevelClick={(level, side) => console.info('level click', side, level)}
        />
      </div>
      <div style={{ flex: 1, minWidth: 320 }}>
        <p className="demo-label">OrderBookPanel</p>
        <OrderBookPanel
          {...orderBookData}
          label="Market depth — RELIANCE"
          removeable
          onRemove={() => {}}
        />
      </div>
    </div>
  );
}

function ChartPanelDemo() {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [timeframe, setTimeframe] = useState('1d');
  // FakeDataFeed: openalgo-charts' own deterministic, no-network feed for demos/tests —
  // features replace it with honba's feed adapter over /quotes + /ws (docs/tasks.md Batch C).
  const [feed] = useState(() => new FakeDataFeed(60));
  return (
    <div className="demo-chart">
      <ChartPanel
        symbol={symbol}
        exchange="NSE"
        timeframe={timeframe}
        feed={feed}
        theme="dark"
        onSymbolChange={setSymbol}
        onTimeframeChange={setTimeframe}
      />
    </div>
  );
}

function MarketSelectDemo() {
  const [symbol, setSymbol] = useState('RELIANCE');
  return (
    <div className="demo-stack">
      <MarketSelect markets={marketsFixture} value={symbol} onChange={setSymbol} />
      <p className="demo-value">selected: {symbol}</p>
    </div>
  );
}

function TimeFrameDropdownDemo() {
  const [timeframe, setTimeframe] = useState('1h');
  return (
    <div className="demo-stack">
      <TimeFrameDropdown value={timeframe} onChange={setTimeframe} />
      <p className="demo-value">selected: {timeframe}</p>
    </div>
  );
}

function InstrumentInfoBarDemo() {
  return (
    <InstrumentInfoBar
      symbol="RELIANCE"
      lastPrice={2985.55}
      changeValue={18.35}
      changePercent={0.62}
      dayHigh={2999.8}
      dayLow={2952.1}
      volume={4820135}
    />
  );
}

function StatusBarDemo() {
  const [connected] = useState(true);
  const [serverTime, setServerTime] = useState(() => new Date());
  // Demo-only ticking clock; Batch H replaces this with the real synced server time.
  useEffect(() => {
    const timer = setInterval(() => setServerTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="demo-stack">
      <StatusBar connected={connected} latencyMs={14} serverTime={serverTime} />
      <StatusBar connected={false} />
    </div>
  );
}

// Unified tile shape across all four demo files: the dashboard renders each `node` inside a
// DemoTile and derives its section counts from these arrays.
export const marketTiles = [
  {
    id: 'orderbook',
    name: 'OrderBook · OrderBookPanel',
    source: 'market/OrderBook{,Panel}',
    description: 'Best-first bids/asks, level click-out. Panel variant adds chrome.',
    wide: true,
    pad: false,
    node: <OrderBookPanelDemo />,
  },
  {
    id: 'chartpanel',
    name: 'ChartPanel',
    source: 'market/ChartPanel',
    description: 'openalgo-charts wrapper over a synthetic feed (FakeDataFeed).',
    wide: true,
    pad: true,
    node: <ChartPanelDemo />,
  },
  {
    id: 'marketselect',
    name: 'MarketSelect',
    source: 'market/MarketSelect',
    description: 'Instrument picker on top of Dropdown.',
    node: <MarketSelectDemo />,
  },
  {
    id: 'timeframedropdown',
    name: 'TimeFrameDropdown',
    source: 'market/TimeFrameDropdown',
    description: 'Controlled timeframe select; ChartPanel embeds it.',
    node: <TimeFrameDropdownDemo />,
  },
  {
    id: 'instrumentinfobar',
    name: 'InstrumentInfoBar',
    source: 'market/InstrumentInfoBar',
    description: 'Last / change% / day range / volume strip.',
    node: <InstrumentInfoBarDemo />,
  },
  {
    id: 'statusbar',
    name: 'StatusBar',
    source: 'market/StatusBar',
    description: 'Connection / latency / clock, entirely prop-fed.',
    node: <StatusBarDemo />,
  },
];
