/* eslint-disable react/prop-types */
const GOAL_OPTIONS = [
  { value: 'interview', title: 'Crack a job interview' },
  { value: 'competitive', title: 'Competitive exam prep' },
  { value: 'academic', title: 'Academic understanding' },
  { value: 'project', title: 'Personal project / skill-building' },
]

function GoalRadioGroup({ value, onChange, disabled = false }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {GOAL_OPTIONS.map((goal) => {
        const selected = value === goal.value
        return (
          <label
            key={goal.value}
            className={`cursor-pointer rounded-xl border p-4 transition ${
              selected ? 'border-[var(--blue)] bg-[var(--lpurple)]' : 'border-[var(--bgray)] bg-white'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <input
              type="radio"
              name="goal"
              className="sr-only"
              checked={selected}
              onChange={() => onChange(goal.value)}
              disabled={disabled}
            />
            <p className="text-sm font-medium text-[var(--dark)]">{goal.title}</p>
          </label>
        )
      })}
    </div>
  )
}

export default GoalRadioGroup
