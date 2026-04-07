/* eslint-disable react/prop-types */
function PillSelect({ options, value, onChange, disabled = false }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              active
                ? 'border-[var(--blue)] bg-[var(--blue)] text-white'
                : 'border-[var(--bgray)] bg-white text-[var(--dark)] hover:border-[var(--palm)]'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export default PillSelect
