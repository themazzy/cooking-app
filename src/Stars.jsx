/** 1–5 stars; tapping the current rating again clears it. */
export default function Stars({ value, onChange, size = 'big' }) {
  return (
    <span className={`stars ${size}`} role={onChange ? 'radiogroup' : 'img'} aria-label={value ? `Rated ${value} of 5` : 'Not rated'}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button key={n} type="button" className={n <= (value ?? 0) ? 'on' : ''} aria-label={`${n} star${n > 1 ? 's' : ''}`} aria-checked={value === n} role="radio" onClick={() => onChange(value === n ? null : n)}>
            ★
          </button>
        ) : (
          <span key={n} className={n <= (value ?? 0) ? 'on' : ''}>
            ★
          </span>
        ),
      )}
    </span>
  )
}
