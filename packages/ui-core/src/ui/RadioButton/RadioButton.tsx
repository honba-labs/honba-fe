// Ported/modernized from bfx-hf-ui-core's src/ui/RadioButton (Apache-2.0).
// The original's `value` prop was actually the checked boolean; renamed to `checked` here for
// clarity while keeping the same onChange/label/id/uppercase/disabled contract.
import './RadioButton.css';

export interface RadioButtonProps {
  id: string;
  checked?: boolean;
  onChange?: () => void;
  label?: string;
  uppercase?: boolean;
  disabled?: boolean;
}

export function RadioButton({
  id,
  checked = false,
  onChange = () => {},
  label = '',
  uppercase = false,
  disabled = false,
}: RadioButtonProps) {
  return (
    <div className="hb-radio-button">
      <input type="radio" id={id} checked={checked} onChange={onChange} disabled={disabled} />
      <label
        style={{ textTransform: uppercase ? 'uppercase' : 'none' }}
        className="hb-radio-button__label"
        htmlFor={id}
      >
        {label}
      </label>
    </div>
  );
}
