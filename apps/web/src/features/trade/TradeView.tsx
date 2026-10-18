import React, { useState } from 'react';
import {
  Star,
  Maximize2,
  Trash2,
  ArrowUp,
} from 'lucide-react';
import { useEquityStore } from '../../core/store/equityStore';
import './TradeView.css';

// Candlestick simulated data for NSE:RELIANCE
interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  ma20: number;
  vol: number;
}

const SAMPLE_EQUITY_CANDLES: Candle[] = [
  { time: '09:15', open: 2915, high: 2928, low: 2910, close: 2925, ma20: 2918, vol: 240 },
  { time: '09:45', open: 2925, high: 2936, low: 2920, close: 2932, ma20: 2922, vol: 380 },
  { time: '10:15', open: 2932, high: 2942, low: 2928, close: 2938, ma20: 2926, vol: 310 },
  { time: '10:45', open: 2938, high: 2945, low: 2934, close: 2940, ma20: 2930, vol: 290 },
  { time: '11:15', open: 2940, high: 2948, low: 2935, close: 2944, ma20: 2934, vol: 340 },
  { time: '11:45', open: 2944, high: 2946, low: 2936, close: 2939, ma20: 2936, vol: 190 },
  { time: '12:15', open: 2939, high: 2942, low: 2930, close: 2933, ma20: 2937, vol: 220 },
  { time: '12:45', open: 2933, high: 2938, low: 2928, close: 2935, ma20: 2936, vol: 180 },
  { time: '13:15', open: 2935, high: 2944, low: 2932, close: 2942, ma20: 2937, vol: 270 },
  { time: '13:45', open: 2942, high: 2952, low: 2940, close: 2950, ma20: 2939, vol: 410 },
  { time: '14:15', open: 2950, high: 2962, low: 2948, close: 2958, ma20: 2942, vol: 520 },
  { time: '14:45', open: 2958, high: 2965, low: 2952, close: 2960, ma20: 2946, vol: 640 },
  { time: '15:15', open: 2960, high: 2964, low: 2938, close: 2940.5, ma20: 2945, vol: 780 },
];

export function TradeView() {
  const {
    activeTicker,
    selectedInstrument,
    availableMargin,
    usedMargin,
    holdings,
    orderBook,
    openOrders,
    orderHistory,
    tradeHistory,
    activeSide,
    activeProduct,
    activeOrderType,
    chartTimeframe,
    chartType,
    showMa20,
    setActiveSide,
    setActiveProduct,
    setActiveOrderType,
    setChartTimeframe,
    setChartType,
    setShowMa20,
    placeOrder,
    cancelOrder,
  } = useEquityStore();

  const holding = holdings[selectedInstrument.symbol] || { quantity: 0, available: 0 };

  const [inputPrice, setInputPrice] = useState(selectedInstrument.price.toString());
  const [inputQuantity, setInputQuantity] = useState('25');
  const [bottomTab, setBottomTab] = useState<'open' | 'orders' | 'trades'>('open');
  const [orderFilter, setOrderFilter] = useState<'all' | 'buy' | 'sell'>('all');

  React.useEffect(() => {
    setInputPrice(selectedInstrument.price.toString());
  }, [selectedInstrument.price]);

  const numPrice = parseFloat(inputPrice) || selectedInstrument.price;
  const numQuantity = parseInt(inputQuantity, 10) || 0;
  const totalValue = numPrice * numQuantity;
  const marginRequired = activeProduct === 'MIS' ? totalValue * 0.2 : totalValue;
  const brokerage = 20.0; // Flat ₹20 discount broker model

  const handleSharesPercent = (pct: number) => {
    if (activeSide === 'buy') {
      const budget = (availableMargin * pct) / 100;
      const effectivePrice = activeProduct === 'MIS' ? numPrice * 0.2 : numPrice;
      const qty = Math.floor(budget / effectivePrice);
      setInputQuantity(Math.max(1, qty).toString());
    } else {
      const qty = Math.floor((holding.available * pct) / 100);
      setInputQuantity(Math.max(1, qty).toString());
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numQuantity <= 0) return;
    placeOrder({
      side: activeSide,
      product: activeProduct,
      type: activeOrderType,
      price: numPrice,
      quantity: numQuantity,
    });
  };

  // SVG Chart Dimensions
  const chartWidth = 720;
  const chartHeight = 360;
  const minPrice = 2900;
  const maxPrice = 2975;
  const priceRange = maxPrice - minPrice;

  const getPriceY = (val: number) => {
    return chartHeight - ((val - minPrice) / priceRange) * chartHeight;
  };

  const maPoints = SAMPLE_EQUITY_CANDLES.map((c, i) => {
    const x = (i / (SAMPLE_EQUITY_CANDLES.length - 1)) * (chartWidth - 50) + 20;
    const y = getPriceY(c.ma20);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="trade-container">
      {/* 1. Equities Instrument Header */}
      <div className="trade-sub-bar card">
        <div className="trade-asset-info">
          <div className="trade-coin-badge" style={{ backgroundColor: selectedInstrument.color }}>
            {selectedInstrument.symbol.slice(0, 3)}
          </div>
          <div>
            <div className="trade-pair-title">
              {selectedInstrument.ticker}
              <span className="trade-market-badge">EQ</span>
            </div>
            <div className="trade-pair-sub">{selectedInstrument.name} · {selectedInstrument.exchange}</div>
          </div>
        </div>

        <div className="trade-price-group">
          <span className="num trade-cur-price">
            {selectedInstrument.currency === 'INR' ? '₹' : '$'}
            {selectedInstrument.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <span className="num trade-price-approx">VWAP: ₹{selectedInstrument.vwap.toFixed(2)}</span>
        </div>

        <div className="trade-stat-item">
          <span className="trade-stat-label">1D Change</span>
          <span className={`num trade-stat-val ${selectedInstrument.change24h >= 0 ? 'color-bullish' : 'color-bearish'}`}>
            {selectedInstrument.change24h >= 0 ? '+' : ''}
            {selectedInstrument.change24h}%
          </span>
        </div>

        <div className="trade-stat-item">
          <span className="trade-stat-label">Day High</span>
          <span className="num trade-stat-val">₹{selectedInstrument.high24h.toLocaleString()}</span>
        </div>

        <div className="trade-stat-item">
          <span className="trade-stat-label">Day Low</span>
          <span className="num trade-stat-val">₹{selectedInstrument.low24h.toLocaleString()}</span>
        </div>

        <div className="trade-stat-item">
          <span className="trade-stat-label">Volume (Shares)</span>
          <span className="num trade-stat-val">{(selectedInstrument.volShares / 1e6).toFixed(2)}M</span>
        </div>

        <div className="trade-stat-item">
          <span className="trade-stat-label">Turnover (₹ Cr)</span>
          <span className="num trade-stat-val">₹{selectedInstrument.turnoverCr}</span>
        </div>

        <div className="trade-sub-right">
          <span className="wunder-pill-env">
            <span className="wunder-pill-dot-warning" /> Paper Trading · NSE
          </span>
          <button type="button" className="trade-star-btn">
            <Star size={16} color="#f59e0b" fill="#f59e0b" />
          </button>
        </div>
      </div>

      {/* 2. Main Terminal Grid */}
      <div className="trade-grid">
        {/* Left Column: Intraday Candlestick Chart */}
        <div className="trade-left-col">
          <div className="card trade-chart-card">
            {/* Toolbar */}
            <div className="trade-chart-toolbar">
              <div className="trade-tf-group">
                {['1m', '5m', '15m', '1H', '1D', '1W'].map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    className={`trade-tf-btn ${chartTimeframe === tf ? 'active' : ''}`}
                    onClick={() => setChartTimeframe(tf)}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              <div className="trade-chart-tools">
                <label className="trade-ma-toggle">
                  <input
                    type="checkbox"
                    checked={showMa20}
                    onChange={(e) => setShowMa20(e.target.checked)}
                  />
                  <span>MA 20</span>
                </label>

                <div className="portfolio-mode-toggle">
                  <button
                    type="button"
                    className={`portfolio-mode-btn ${chartType === 'candles' ? 'active' : ''}`}
                    onClick={() => setChartType('candles')}
                  >
                    Candles
                  </button>
                  <button
                    type="button"
                    className={`portfolio-mode-btn ${chartType === 'line' ? 'active' : ''}`}
                    onClick={() => setChartType('line')}
                  >
                    Line
                  </button>
                </div>

                <button type="button" className="trade-tool-btn">
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>

            {/* OHLC Banner */}
            <div className="trade-ohlc-banner">
              <span>O <b className="num">2,960.00</b></span>
              <span>H <b className="num">2,965.00</b></span>
              <span>L <b className="num">2,938.00</b></span>
              <span>C <b className="num" style={{ color: 'var(--bullish)' }}>2,940.50</b></span>
              <span>Vol <b className="num">780K shares</b></span>
            </div>

            {/* SVG Candlestick Chart */}
            <div className="trade-svg-canvas">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" width="100%" height="100%">
                {[2960, 2940, 2920, 2900].map((price) => {
                  const y = getPriceY(price);
                  return (
                    <g key={price}>
                      <line x1="0" y1={y} x2={chartWidth - 50} y2={y} stroke="var(--chart-grid)" strokeDasharray="3 3" />
                      <text x={chartWidth - 45} y={y + 4} fill="var(--fg-subtle)" fontSize="11" fontFamily="var(--font-mono)">
                        ₹{price}
                      </text>
                    </g>
                  );
                })}

                {SAMPLE_EQUITY_CANDLES.map((c, i) => {
                  const candleWidth = 18;
                  const x = (i / (SAMPLE_EQUITY_CANDLES.length - 1)) * (chartWidth - 80) + 20;
                  const isUp = c.close >= c.open;
                  const candleColor = isUp ? 'var(--bullish)' : 'var(--bearish)';

                  const topWickY = getPriceY(c.high);
                  const btmWickY = getPriceY(c.low);
                  const bodyTopY = getPriceY(Math.max(c.open, c.close));
                  const bodyBtmY = getPriceY(Math.min(c.open, c.close));
                  const bodyHeight = Math.max(2, bodyBtmY - bodyTopY);

                  return (
                    <g key={c.time}>
                      <line
                        x1={x + candleWidth / 2}
                        y1={topWickY}
                        x2={x + candleWidth / 2}
                        y2={btmWickY}
                        stroke={candleColor}
                        strokeWidth="1.5"
                      />
                      <rect
                        x={x}
                        y={bodyTopY}
                        width={candleWidth}
                        height={bodyHeight}
                        fill={candleColor}
                        rx="1"
                      />
                    </g>
                  );
                })}

                {showMa20 && (
                  <polyline
                    points={maPoints}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </div>

            {/* Time Axis */}
            <div className="trade-time-axis">
              {['09:15', '10:00', '10:45', '11:30', '12:15', '13:00', '13:45', '14:30', '15:15', '15:30'].map(
                (t, idx) => (
                  <span key={idx}>{t}</span>
                )
              )}
            </div>
            <div className="trade-sim-disclaimer">NSE Trading Hours: 09:15 - 15:30 IST · Simulated Market Depth</div>
          </div>

          {/* Bottom Margins Strip */}
          <div className="trade-stats-strip card">
            <div className="trade-strip-stat">
              <span className="trade-strip-label">Available Margin</span>
              <span className="num trade-strip-val">₹{availableMargin.toLocaleString()}</span>
              <span className="pill pill-bullish" style={{ fontSize: '10px', padding: '1px 5px' }}>
                Trading Cash
              </span>
            </div>

            <div className="trade-strip-stat">
              <span className="trade-strip-label">Used Margin</span>
              <span className="num trade-strip-val">₹{usedMargin.toLocaleString()}</span>
              <span className="trade-strip-sub">Locked in orders</span>
            </div>

            <div className="trade-strip-stat">
              <span className="trade-strip-label">Demat Holdings</span>
              <span className="num trade-strip-val">{holding.quantity} shares</span>
              <span className="trade-strip-sub">Available: {holding.available} shares</span>
            </div>

            <div className="trade-strip-stat">
              <span className="trade-strip-label">Holding Value</span>
              <span className="num trade-strip-val">
                ₹{(holding.quantity * selectedInstrument.price).toLocaleString()}
              </span>
              <span className="trade-strip-sub">Avg Buy: ₹{holding.avgBuyPrice || 0}</span>
            </div>
          </div>

          {/* Bottom Tabs Table: Orders & Fills */}
          <div className="card trade-orders-card">
            <div className="trade-orders-header">
              <div className="trade-order-tabs">
                <button
                  type="button"
                  className={`trade-order-tab ${bottomTab === 'open' ? 'active' : ''}`}
                  onClick={() => setBottomTab('open')}
                >
                  Open Orders ({openOrders.length})
                </button>
                <button
                  type="button"
                  className={`trade-order-tab ${bottomTab === 'orders' ? 'active' : ''}`}
                  onClick={() => setBottomTab('orders')}
                >
                  Order Book History
                </button>
                <button
                  type="button"
                  className={`trade-order-tab ${bottomTab === 'trades' ? 'active' : ''}`}
                  onClick={() => setBottomTab('trades')}
                >
                  Executed Fills
                </button>
              </div>

              <div className="trade-orders-filter-actions">
                <div className="trade-pill-filters">
                  {(['all', 'buy', 'sell'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      className={`trade-pill-filter ${orderFilter === filter ? 'active' : ''}`}
                      onClick={() => setOrderFilter(filter)}
                    >
                      {filter.toUpperCase()}
                    </button>
                  ))}
                </div>
                {openOrders.length > 0 && bottomTab === 'open' && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => openOrders.forEach((o) => cancelOrder(o.id))}
                  >
                    <Trash2 size={13} /> Cancel all
                  </button>
                )}
              </div>
            </div>

            <div className="trade-table-wrapper">
              {bottomTab === 'open' && (
                <table className="trade-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Ticker</th>
                      <th>Product</th>
                      <th>Side</th>
                      <th>Type</th>
                      <th style={{ textAlign: 'right' }}>Price (₹)</th>
                      <th style={{ textAlign: 'right' }}>Shares</th>
                      <th style={{ textAlign: 'right' }}>Order Value (₹)</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openOrders.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', color: 'var(--fg-muted)', padding: '24px' }}>
                          No pending limit orders in the book
                        </td>
                      </tr>
                    ) : (
                      openOrders.map((ord) => (
                        <tr key={ord.id}>
                          <td style={{ color: 'var(--fg-muted)', fontSize: '12px' }}>
                            {new Date(ord.timestamp).toLocaleTimeString()}
                          </td>
                          <td style={{ fontWeight: 600 }}>{ord.ticker}</td>
                          <td>
                            <span className="pill pill-neutral">{ord.product}</span>
                          </td>
                          <td>
                            <span className={`pill ${ord.side === 'buy' ? 'pill-bullish' : 'pill-bearish'}`}>
                              {ord.side.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ textTransform: 'uppercase' }}>{ord.type}</td>
                          <td className="num" style={{ textAlign: 'right' }}>
                            ₹{ord.price.toLocaleString()}
                          </td>
                          <td className="num" style={{ textAlign: 'right' }}>
                            {ord.quantity}
                          </td>
                          <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>
                            ₹{ord.total.toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--bearish)' }}
                              onClick={() => cancelOrder(ord.id)}
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {bottomTab === 'orders' && (
                <table className="trade-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Ticker</th>
                      <th>Side</th>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderHistory.map((ord) => (
                      <tr key={ord.id}>
                        <td style={{ color: 'var(--fg-muted)' }}>{new Date(ord.timestamp).toLocaleTimeString()}</td>
                        <td style={{ fontWeight: 600 }}>{ord.ticker}</td>
                        <td>
                          <span className={`pill ${ord.side === 'buy' ? 'pill-bullish' : 'pill-bearish'}`}>
                            {ord.side.toUpperCase()}
                          </span>
                        </td>
                        <td>{ord.product}</td>
                        <td className="num">₹{ord.price.toLocaleString()}</td>
                        <td className="num">{ord.quantity}</td>
                        <td className="num">₹{ord.total.toLocaleString()}</td>
                        <td>
                          <span className="pill pill-neutral">{ord.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {bottomTab === 'trades' && (
                <table className="trade-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Ticker</th>
                      <th>Side</th>
                      <th>Filled Price</th>
                      <th>Shares</th>
                      <th>Brokerage</th>
                      <th>Turnover</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tradeHistory.map((tr) => (
                      <tr key={tr.id}>
                        <td style={{ color: 'var(--fg-muted)' }}>{new Date(tr.timestamp).toLocaleTimeString()}</td>
                        <td style={{ fontWeight: 600 }}>{tr.ticker}</td>
                        <td>
                          <span className={`pill ${tr.side === 'buy' ? 'pill-bullish' : 'pill-bearish'}`}>
                            {tr.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="num">₹{tr.price.toLocaleString()}</td>
                        <td className="num">{tr.quantity}</td>
                        <td className="num">₹{tr.brokerage.toFixed(2)}</td>
                        <td className="num" style={{ fontWeight: 600 }}>
                          ₹{tr.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Center-Right Column: Market Depth (Level 2) */}
        <div className="trade-book-col card">
          <div className="trade-book-head">
            <span className="trade-book-title">Market Depth (L2)</span>
            <div className="portfolio-mode-toggle">
              <button type="button" className="portfolio-mode-btn active">Book</button>
              <button type="button" className="portfolio-mode-btn">Trades</button>
            </div>
          </div>

          <div className="trade-book-columns">
            <span>Ask Price (₹)</span>
            <span style={{ textAlign: 'right' }}>Orders</span>
            <span style={{ textAlign: 'right' }}>Shares</span>
          </div>

          {/* Asks (Red) */}
          <div className="trade-book-rows">
            {orderBook.asks.map((ask) => (
              <div
                key={ask.price}
                className="trade-book-row"
                onClick={() => setInputPrice(ask.price.toString())}
              >
                <div className="trade-book-depth-bar depth-ask" style={{ width: `${ask.depth}%` }} />
                <span className="num trade-book-price color-bearish">₹{ask.price.toFixed(2)}</span>
                <span className="num trade-book-amt">{Math.floor(ask.amount / 15)}</span>
                <span className="num trade-book-total">{ask.amount}</span>
              </div>
            ))}
          </div>

          {/* Mid Spread Banner */}
          <div className="trade-book-mid">
            <span className="num trade-book-mid-price color-bullish">
              ₹{selectedInstrument.price.toFixed(2)} <ArrowUp size={13} style={{ display: 'inline' }} />
            </span>
            <span className="trade-book-mid-label">LTP</span>
            <span className="trade-book-spread">Spread ₹{orderBook.spread.toFixed(2)}</span>
          </div>

          {/* Bids (Green) */}
          <div className="trade-book-rows">
            {orderBook.bids.map((bid) => (
              <div
                key={bid.price}
                className="trade-book-row"
                onClick={() => setInputPrice(bid.price.toString())}
              >
                <div className="trade-book-depth-bar depth-bid" style={{ width: `${bid.depth}%` }} />
                <span className="num trade-book-price color-bullish">₹{bid.price.toFixed(2)}</span>
                <span className="num trade-book-amt">{Math.floor(bid.amount / 15)}</span>
                <span className="num trade-book-total">{bid.amount}</span>
              </div>
            ))}
          </div>

          <div className="trade-book-hint">Click any depth price level to fill into order ticket.</div>
        </div>

        {/* Far Right Column: Order Entry Ticket */}
        <div className="trade-ticket-col card">
          {/* Buy / Sell Tabs */}
          <div className="trade-ticket-sides">
            <button
              type="button"
              className={`trade-side-tab ${activeSide === 'buy' ? 'active-buy' : ''}`}
              onClick={() => setActiveSide('buy')}
            >
              Buy
            </button>
            <button
              type="button"
              className={`trade-side-tab ${activeSide === 'sell' ? 'active-sell' : ''}`}
              onClick={() => setActiveSide('sell')}
            >
              Sell
            </button>
          </div>

          {/* Product Type (CNC vs MIS) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            <button
              type="button"
              className={`btn btn-sm ${activeProduct === 'CNC' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveProduct('CNC')}
            >
              CNC (Delivery)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeProduct === 'MIS' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveProduct('MIS')}
            >
              MIS (Intraday 5x)
            </button>
          </div>

          {/* Order Types */}
          <div className="trade-ticket-types">
            {(['limit', 'market', 'sl'] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={`trade-type-tab ${activeOrderType === type ? 'active' : ''}`}
                onClick={() => setActiveOrderType(type)}
              >
                {type === 'limit' ? 'Limit' : type === 'market' ? 'Market' : 'Stop-Loss'}
              </button>
            ))}
          </div>

          <form onSubmit={handleFormSubmit} className="trade-ticket-form">
            <div className="trade-ticket-avail">
              <span>Available Margin</span>
              <span className="num trade-avail-num">₹{availableMargin.toLocaleString()}</span>
            </div>

            {/* Price Input */}
            {activeOrderType !== 'market' && (
              <div className="trade-field-group">
                <label className="trade-field-label">Price (₹)</label>
                <div className="trade-input-wrapper">
                  <input
                    type="number"
                    step="0.05"
                    value={inputPrice}
                    onChange={(e) => setInputPrice(e.target.value)}
                    className="input num trade-field-input"
                    required
                  />
                  <span className="trade-input-suffix">INR</span>
                </div>
              </div>
            )}

            {/* Quantity Input in Shares */}
            <div className="trade-field-group">
              <label className="trade-field-label">Quantity (Shares)</label>
              <div className="trade-input-wrapper">
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={inputQuantity}
                  onChange={(e) => setInputQuantity(e.target.value)}
                  className="input num trade-field-input"
                  required
                />
                <span className="trade-input-suffix">Shares</span>
              </div>
            </div>

            {/* Quick Quantity Buttons */}
            <div className="trade-pct-row">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  className="trade-pct-btn"
                  onClick={() => handleSharesPercent(pct)}
                >
                  {pct === 100 ? 'Max' : `${pct}%`}
                </button>
              ))}
            </div>

            {/* Margin Required Calculation */}
            <div className="trade-fee-box">
              <div className="trade-fee-row">
                <span>Order Value</span>
                <span className="num">₹{totalValue.toLocaleString()}</span>
              </div>
              <div className="trade-fee-row">
                <span>Margin Required</span>
                <span className="num" style={{ fontWeight: 600, color: 'var(--fg-primary)' }}>
                  ₹{marginRequired.toLocaleString()}
                </span>
              </div>
              <div className="trade-fee-row">
                <span>Brokerage</span>
                <span className="num">₹{brokerage.toFixed(2)} Flat</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`btn btn-lg trade-submit-btn ${
                activeSide === 'buy' ? 'btn-buy' : 'btn-sell'
              }`}
            >
              {activeSide.toUpperCase()} {selectedInstrument.symbol} · {activeProduct}
            </button>
          </form>

          <div className="trade-ticket-note">
            NSE Cash segment simulated execution. Zero brokerage on equity delivery.
          </div>
        </div>
      </div>
    </div>
  );
}
