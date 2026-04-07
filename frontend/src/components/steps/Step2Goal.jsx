/* eslint-disable react/prop-types */
const GOAL_OPTIONS = [
  { value: 'exam', label: 'Exam' },
  { value: 'job', label: 'Job' },
  { value: 'skill', label: 'Skill' },
  { value: 'revision', label: 'Revision' },
]

function Step2Goal({ formData, onFieldChange }) {
  return (
    <div className="topic-step-content">
      <h3>Goal &amp; Duration</h3>
      <p>Select why you are learning this topic and your timeline.</p>

      <div className="field">
        <label>Goal Type</label>
        <div className="topic-card-grid">
          {GOAL_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`topic-option-card${formData.goalType === option.value ? ' active' : ''}`}
              onClick={() => onFieldChange('goalType', option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="durationDays">Duration (Days)</label>
        <input
          id="durationDays"
          type="number"
          min={1}
          max={90}
          value={formData.durationDays}
          onChange={(event) => onFieldChange('durationDays', event.target.value)}
        />
      </div>
    </div>
  )
}

export default Step2Goal
