// 色スワッチ行(radiogroup)

type Props = {
  label: string
  colors: string[]
  current: string
  onPick: (color: string) => void
}

export const SwatchRow = ({ label, colors, current, onPick }: Props) => (
  <div className='ac-part-row'>
    <span className='ac-part-label'>{label}</span>
    <div className='ac-chip-scroll' role='radiogroup' aria-label={label}>
      {colors.map((color) => (
        <button
          key={color}
          type='button'
          role='radio'
          aria-checked={color.toLowerCase() === current.toLowerCase()}
          aria-label={color}
          className={`ac-swatch${color.toLowerCase() === current.toLowerCase() ? ' is-selected' : ''}`}
          style={{ background: color }}
          onClick={() => onPick(color)}
        />
      ))}
    </div>
  </div>
)
