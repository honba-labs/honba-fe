// Live demos for `ui-core/src/ui/*` (Batch A primitives, docs/tasks.md) and `ui-core/src/hooks/*`
// (Batch B). Every demo owns its own local state — the dashboard composes, never wraps or
// re-implements, the components it showcases.
import { useState } from 'react';
import {
  AttentionBar,
  Button,
  DatePicker,
  Dropdown,
  Indicator,
  Input,
  Modal,
  Panel,
  PanelSettings,
  PLNumber,
  ProgressBar,
  RadioButton,
  Scrollbars,
  SimpleDropdown,
  Tabs,
  useCountdown,
  useHover,
  useModalFocus,
  useSize,
  useToggle,
} from '@honba/ui-core';
import type { ButtonVariant, DropdownOption, TabItem } from '@honba/ui-core';
import { DemoTile } from './demo-tile';

const BUTTON_VARIANTS: ButtonVariant[] = ['default', 'blue', 'green', 'red', 'gray'];

const TOPIC_OPTIONS: DropdownOption[] = [
  { label: 'Equities', value: 'equities' },
  { label: 'Index', value: 'index' },
  { label: 'Futures & Options', value: 'fo' },
  { label: 'Mutual funds', value: 'mf' },
];

function ButtonDemo() {
  return (
    <>
      <div className="demo-row">
        {BUTTON_VARIANTS.map((variant) => (
          <Button key={variant} variant={variant} label={variant} onClick={() => {}} />
        ))}
      </div>
      <div className="demo-row">
        <Button label="Disabled" disabled onClick={() => {}} />
        <Button label="Inactive" inactive onClick={() => {}} />
        <Button label="With children &#8594;" onClick={() => {}}>
          <span>label prop</span>
        </Button>
      </div>
    </>
  );
}

function InputDemo() {
  const [value, setValue] = useState('RELIANCE');
  return (
    <div className="demo-stack">
      <Input label="Symbol" value={value} onChange={setValue} placeholder="Type a symbol…" />
      <Input label="Quantity" type="number" value={100} onChange={() => {}} min={1} />
      <Input label="Autofocused" onChange={() => {}} shouldBeAutofocused={false} />
      <Input label="Disabled" value="" onChange={() => {}} disabled />
      <p className="demo-value">value: {value || '(empty)'}</p>
    </div>
  );
}

function DropdownDemo() {
  const [value, setValue] = useState('');
  return (
    <div className="demo-stack">
      <Dropdown options={TOPIC_OPTIONS} value={value} onChange={setValue} label="Asset class" />
      <p className="demo-value">selected: {value || '(none)'}</p>
    </div>
  );
}

function SimpleDropdownDemo() {
  return (
    <SimpleDropdown
      label={<span>Time frame</span>}
      options={[
        <span key="1">1 minute</span>,
        <span key="2">1 hour</span>,
        <span key="3">1 day</span>,
      ]}
    />
  );
}

function ModalDemo() {
  // useToggle returns [value, toggle, setTrue, setFalse]
  const [isOpen, , open, close] = useToggle(false);
  return (
    <>
      <div className="demo-row">
        <Button label="Open modal" variant="blue" onClick={open} />
      </div>
      <Modal isOpen={isOpen} onClose={close} label="Edit order ORD-182">
        <p className="demo-value">
          Escape or ✕ closes. `Modal` is built on `useModalFocus` — focus is trapped on the
          dialog while open.
        </p>
        <div className="demo-row">
          <Button label="Close" onClick={close} />
        </div>
      </Modal>
    </>
  );
}

function PanelDemo() {
  const [settingsOpen, toggleSettingsOpen] = useToggle(false);
  return (
    <Panel
      label="Chart"
      hasShadow
      headerComponents={<span className="demo-value">RELIANCE · NSE</span>}
      onToggleSettings={toggleSettingsOpen}
      settingsOpen={settingsOpen}
      removeable
      onRemove={() => {}}
      footer={<span className="demo-value">removeable + settings-toggle header controls</span>}
    >
      <p className="demo-value">
        The dashboard's demo tiles are themselves `Panel`s — this one additionally flips on the
        settings gear and remove-button slots.
      </p>
    </Panel>
  );
}

function TabsDemo() {
  const tabs: TabItem[] = [
    { label: 'Orders', value: 'orders' },
    { label: 'Positions', value: 'positions' },
    { label: 'History', value: 'history' },
    { label: 'Balances (soon)', value: 'balances', disabled: true },
  ];
  const [activeTab, setActiveTab] = useState('orders');
  return (
    <div className="demo-stack">
      <Tabs tabs={tabs} activeTab={activeTab} onTabClick={setActiveTab} />
      <p className="demo-value">active: {activeTab}</p>
    </div>
  );
}

function RadioButtonDemo() {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  return (
    <div className="demo-row">
      <RadioButton id="demo-buy" checked={side === 'buy'} onChange={() => setSide('buy')} label="Buy" />
      <RadioButton id="demo-sell" checked={side === 'sell'} onChange={() => setSide('sell')} label="Sell" uppercase />
      <RadioButton id="demo-off" checked={false} onChange={() => {}} disabled label="Disabled" />
      <span className="demo-value">side: {side}</span>
    </div>
  );
}

function DatePickerDemo() {
  const [value, setValue] = useState<Date | null>(new Date('2026-10-16'));
  return (
    <div className="demo-stack">
      <DatePicker value={value} onChange={setValue} label="Expiry date" />
      <p className="demo-value">selected: {value ? value.toDateString() : '(none)'}</p>
    </div>
  );
}

function SmallPartsDemo() {
  return (
    <div className="demo-stack">
      <ProgressBar percent={62} showPercent />
      <div className="demo-row">
        <Indicator color="green" />
        <Indicator color="red" />
        <Indicator color="grey" />
        <Indicator color="white" blinking />
        <span className="demo-label">Indicator</span>
      </div>
      <div className="demo-row">
        <PLNumber value={1425000} ccy="INR" />
        <PLNumber value={-82750} ccy="INR" />
        <span className="demo-label">PLNumber</span>
      </div>
      <AttentionBar tone="red">Order rejected by broker adapter — see event log</AttentionBar>
      <AttentionBar tone="yellow">Positions are being reduced by risk engine</AttentionBar>
      <AttentionBar tone="green">Paper account connected</AttentionBar>
      <div className="demo-row">
        <Button label="Toggle Scrollbars demo" inactive onClick={() => {}} />
        <Scrollbars style={{ maxHeight: 80, flex: 1 }}>
          <p className="demo-value" style={{ height: 140, margin: 0 }}>
            `Scrollbars` is the generic scroll container everything tall sits inside
            (&hellip;more content below the fold&hellip;).
          </p>
        </Scrollbars>
      </div>
    </div>
  );
}

function PanelSettingsDemo() {
  const [closed, setClosed] = useState(false);
  return (
    <>
      <div className="demo-row">
        {closed ? null : (
          <PanelSettings
            title="Chart settings"
            content={
              <Input label="Bar height" value="40px" onChange={() => {}} />
            }
            onClose={() => setClosed(true)}
          />
        )}
        <Button
          label={closed ? 'Open PanelSettings' : 'Close PanelSettings'}
          onClick={() => setClosed(!closed)}
        />
      </div>
    </>
  );
}

// --- hooks (Batch B) -------------------------------------------------------------------------

function UseToggleDemo() {
  const [on, toggle] = useToggle(false);
  return (
    <div className="demo-row">
      <Button label={on ? 'ON' : 'OFF'} variant={on ? 'green' : 'gray'} onClick={toggle} />
      <span className="demo-value">useToggle() &#8594; boolean + toggle/setTrue/setFalse</span>
    </div>
  );
}

function UseHoverDemo() {
  const [ref, isHovered] = useHover<HTMLDivElement>();
  return (
    <div className="demo-stack">
      <div ref={ref} className="demo-box">
        Hover me
      </div>
      <span className="demo-value">isHovered: {String(isHovered)}</span>
    </div>
  );
}

function UseSizeDemo() {
  const [ref, size] = useSize<HTMLDivElement>();
  return (
    <div className="demo-stack">
      <div ref={ref} className="demo-box" style={{ resize: 'horizontal' }}>
        Drag my bottom-right corner
      </div>
      <span className="demo-value">
        {size.width.toFixed(0)} × {size.height.toFixed(0)} px
      </span>
    </div>
  );
}

function UseCountdownDemo() {
  const { countdown, isFinished, resetCountdown } = useCountdown(30);
  return (
    <div className="demo-stack">
      <ProgressBar percent={Math.max(0, (countdown / 30) * 100)} />
      <div className="demo-row">
        <span className="demo-value">{isFinished ? 'finished' : `${countdown}s remaining`}</span>
        <Button label="Reset" onClick={resetCountdown} />
      </div>
    </div>
  );
}

function UseModalFocusDemo() {
  // The hook just focuses the first focusable element inside `bodySelector` while `isOpen` —
  // it composes with any dialog markup, not only the package's own Modal.
  const [isOpen, , open, close] = useToggle(false);
  useModalFocus(isOpen, { bodySelector: '.demo-focus-body', titleSelector: '.demo-focus-title' });
  return (
    <div className="demo-stack">
      <div className="demo-row">
        <Button label="Run focus hook" onClick={open} />
      </div>
      <div
        role="dialog"
        aria-label="Focused dialog demo"
        className="demo-box demo-focus-title"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') close();
        }}
      >
        <div className="demo-focus-body">
          <Button label="I receive focus on open" onClick={close} />
        </div>
      </div>
    </div>
  );
}

export const uiTiles = [
  {
    id: 'button',
    name: 'Button',
    source: 'ui/Button',
    description: 'Variants + disabled/inactive states.',
    node: <ButtonDemo />,
  },
  {
    id: 'input',
    name: 'Input',
    source: 'ui/Input',
    description: 'Controlled text number inputs.',
    node: <InputDemo />,
  },
  {
    id: 'dropdown',
    name: 'Dropdown',
    source: 'ui/Dropdown',
    description: 'Generic select; MarketSelect and TimeFrameDropdown use it below.',
    node: <DropdownDemo />,
  },
  {
    id: 'simpledropdown',
    name: 'SimpleDropdown',
    source: 'ui/SimpleDropdown',
    description: 'Label + content slot variant.',
    node: <SimpleDropdownDemo />,
  },
  {
    id: 'modal',
    name: 'Modal',
    source: 'ui/Modal',
    description: 'Overlay dialog built on useModalFocus.',
    node: <ModalDemo />,
  },
  {
    id: 'panel',
    name: 'Panel',
    source: 'ui/Panel',
    description: 'Every tile on this page is a Panel.',
    node: <PanelDemo />,
  },
  {
    id: 'tabs',
    name: 'Tabs',
    source: 'ui/Tabs',
    description: 'Generic tab strip.',
    node: <TabsDemo />,
  },
  {
    id: 'radiobutton',
    name: 'RadioButton',
    source: 'ui/RadioButton',
    description: 'Radio + label pair.',
    node: <RadioButtonDemo />,
  },
  {
    id: 'datepicker',
    name: 'DatePicker',
    source: 'ui/DatePicker',
    description: 'Date input with min max validation.',
    node: <DatePickerDemo />,
  },
  {
    id: 'panelsettings',
    name: 'PanelSettings',
    source: 'ui/PanelSettings',
    description: 'Config side-panel skeleton.',
    node: <PanelSettingsDemo />,
  },
  {
    id: 'small-parts',
    name: 'ProgressBar · Indicator · PLNumber · AttentionBar · Scrollbars',
    source: 'ui/*',
    description: 'The small primitives, together.',
    node: <SmallPartsDemo />,
  },
];

export const hookTiles = [
  {
    id: 'usetoggle',
    name: 'useToggle',
    source: 'hooks/useToggle',
    description: undefined,
    node: <UseToggleDemo />,
  },
  {
    id: 'usehover',
    name: 'useHover',
    source: 'hooks/useHover',
    description: undefined,
    node: <UseHoverDemo />,
  },
  {
    id: 'usesize',
    name: 'useSize',
    source: 'hooks/useSize',
    description: 'ResizeObserver-backed.',
    node: <UseSizeDemo />,
  },
  {
    id: 'usecountdown',
    name: 'useCountdown',
    source: 'hooks/useCountdown',
    description: undefined,
    node: <UseCountdownDemo />,
  },
  {
    id: 'usemodalfocus',
    name: 'useModalFocus',
    source: 'hooks/useModalFocus',
    description: undefined,
    node: <UseModalFocusDemo />,
  },
];
