/* eslint-disable react/prop-types */
function FormField({ label, htmlFor, error, children }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--dark)]">
        {label}
      </label>
      {children}
      {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
    </div>
  )
}

export default FormField
