import { useCallback, useRef, useEffect } from 'react'
import styles from './ColorPickerCompact.module.css'

const PRESET_COLORS = [
  '#ff9329', // Warm Amber
  '#ffffff', // Pure White
  '#ef4444', // Red
  '#f59e0b', // Gold
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
]

export function ColorPickerCompact({
  color,
  value,
  disabled = false,
  onChange,
  onCommit,
}) {
  const activeColor = color || value || '#ff8844'
  const currentHexRef = useRef(activeColor)

  useEffect(() => {
    currentHexRef.current = activeColor
  }, [activeColor])

  const handleNativeColorInput = useCallback((e) => {
    if (disabled) return
    const hex = e.target.value
    currentHexRef.current = hex
    onChange?.(hex)
    onCommit?.(hex)
  }, [disabled, onChange, onCommit])

  const handlePresetSelect = useCallback((hex) => {
    if (disabled) return
    currentHexRef.current = hex
    onChange?.(hex)
    onCommit?.(hex)
  }, [disabled, onChange, onCommit])

  return (
    <div
      className={[styles.wrapper, disabled && styles.disabled].filter(Boolean).join(' ')}
      aria-label="Color picker"
      aria-disabled={disabled}
    >
      <div className={styles.row}>
        <label
          className={styles.swatchLabel}
          title={disabled ? 'Device offline or powered off' : 'Click to open custom color picker'}
        >
          {/* Circular container with overflow clipping to eliminate square artifacts */}
          <div className={styles.swatchWrapper}>
            <div className={styles.swatchWheel} aria-hidden="true" />
          </div>
          <input
            type="color"
            value={activeColor.length === 7 ? activeColor : '#ff8844'}
            onChange={handleNativeColorInput}
            disabled={disabled}
            className={styles.nativeColorInput}
            aria-label="Custom color picker"
          />
          <span className={styles.pickerHint}>Custom Color...</span>
        </label>
      </div>

      <div className={styles.presetsRow}>
        {PRESET_COLORS.map(preset => (
          <button
            key={preset}
            type="button"
            disabled={disabled}
            className={[
              styles.presetSwatch,
              activeColor.toLowerCase() === preset.toLowerCase() && styles.presetActive,
            ].filter(Boolean).join(' ')}
            style={{ backgroundColor: preset }}
            onClick={() => handlePresetSelect(preset)}
            aria-label={`Select color ${preset}`}
            title={`Select ${preset}`}
          />
        ))}
      </div>
    </div>
  )
}
