// Ported/modernized from bfx-hf-ui-core's src/components/ExchangeInfoBar (Apache-2.0), renamed
// `InstrumentInfoBar` per docs/tasks.md Batch C ("same idea, not exchange-specific"). The
// original wraps Bitfinex's own `@ufx-ui/core` `Ticker`/`TickerList` components inside a `Panel`,
// fed from Redux (`activeMarketTicker`/`allTickersArray`) with a currency-icon/favorites/volume-
// unit feature set specific to a crypto exchange (`CCYIcon`, `VOLUME_UNIT`, favorites). None of
// that is ported (see Shared conventions: no `@ufx-ui/*`, no Redux, no backend calls here) — this
// keeps just the "last price / change / day range / volume" strip for a single instrument,
// `ExchangeInfoBarItem`'s label+value layout re-implemented as plain props-in markup.
import type { ReactNode } from 'react';
import clsx from 'clsx';

import './InstrumentInfoBar.css';

export interface InstrumentInfoBarProps {
  symbol: string;
  lastPrice: number;
  /** Absolute change from the previous close/reference price. */
  changeValue?: number;
  /** Percentage change from the previous close/reference price. */
  changePercent?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  priceDecimals?: number;
  className?: string;
}

function formatPrice(value: number, decimals: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatVolume(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

interface InfoItemProps {
  label: string;
  children: ReactNode;
  tone?: 'bullish' | 'bearish' | undefined;
}

function InfoItem({ label, children, tone }: InfoItemProps) {
  return (
    <div className="hb-instrument-info-bar__item">
      <p className="hb-instrument-info-bar__label">{label}</p>
      <div className={clsx('hb-instrument-info-bar__value', tone)}>{children}</div>
    </div>
  );
}

export function InstrumentInfoBar({
  symbol,
  lastPrice,
  changeValue,
  changePercent,
  dayHigh,
  dayLow,
  volume,
  priceDecimals = 2,
  className,
}: InstrumentInfoBarProps) {
  const changeTone: 'bullish' | 'bearish' | undefined =
    changeValue === undefined ? undefined : changeValue >= 0 ? 'bullish' : 'bearish';
  const sign = changeValue !== undefined && changeValue > 0 ? '+' : '';

  return (
    <div className={clsx('hb-instrument-info-bar', className)}>
      <InfoItem label={symbol}>{formatPrice(lastPrice, priceDecimals)}</InfoItem>
      {changeValue !== undefined && (
        <InfoItem label="Change" tone={changeTone}>
          {sign}
          {formatPrice(changeValue, priceDecimals)}
          {changePercent !== undefined && (
            <>
              {' '}
              ({sign}
              {formatPrice(changePercent, 2)}%)
            </>
          )}
        </InfoItem>
      )}
      {dayHigh !== undefined && <InfoItem label="High">{formatPrice(dayHigh, priceDecimals)}</InfoItem>}
      {dayLow !== undefined && <InfoItem label="Low">{formatPrice(dayLow, priceDecimals)}</InfoItem>}
      {volume !== undefined && <InfoItem label="Volume">{formatVolume(volume)}</InfoItem>}
    </div>
  );
}
