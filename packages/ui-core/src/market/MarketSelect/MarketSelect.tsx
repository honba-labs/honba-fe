// Ported/modernized from bfx-hf-ui-core's src/components/MarketSelect (Apache-2.0). The
// original is a `ui/Dropdown` wired to Bitfinex-specific market objects (`uiID`/`restID`/`wsID`,
// perp vs. spot pair formatting via `getPairFromMarket`/`getCurrencySymbol`) plus a
// favorites-in-Redux feature (`savePairs`/`favoritePairs`) that depends on `@ufx-ui/bfx-containers`
// and Bitfinex's own auth token — none of which has a honba equivalent (see docs/tasks.md Batch
// C and Shared conventions: no backend calls or Redux in `ui-core`). This keeps the generic
// shape — a searchable list of instruments rendered through `ui/Dropdown` — and drops the
// Bitfinex-specific market-object fields and the favorites feature; a honba-specific favorites
// list, if wanted, belongs in `apps/web` wrapping this component with its own options list.
import { Dropdown } from '../../ui/Dropdown';
import type { DropdownOption } from '../../ui/Dropdown';

/** One selectable instrument. honba's own instrument shape maps onto this at the call site. */
export interface MarketOption {
  /** Unique instrument identifier passed to `onChange` (e.g. honba's symbol/instrument id). */
  symbol: string;
  /** Display label; defaults to `exchange:symbol` or `symbol` when omitted. */
  label?: string;
  exchange?: string;
}

export interface MarketSelectProps {
  markets: MarketOption[];
  value?: string;
  onChange: (symbol: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function labelFor(market: MarketOption): string {
  if (market.label) return market.label;
  return market.exchange ? `${market.exchange}:${market.symbol}` : market.symbol;
}

export function MarketSelect({
  markets,
  value,
  onChange,
  placeholder = 'Select a market',
  disabled = false,
  className,
}: MarketSelectProps) {
  const options: DropdownOption[] = markets.map((market) => ({
    label: labelFor(market),
    value: market.symbol,
  }));

  return (
    <Dropdown
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}
