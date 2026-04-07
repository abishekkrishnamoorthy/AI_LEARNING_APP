/* eslint-disable react/prop-types */
const SESSION_TYPES = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
]

const DAY_OPTIONS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
]

function Step3Time({ formData, onStudyTimeChange, onToggleAvailableDay }) {
  return (
    <div className="topic-step-content">
      <h3>Study Time</h3>
      <p>Define your daily learning rhythm.</p>

      <div className="field">
        <label htmlFor="hoursPerDay">Hours Per Day: {formData.studyTime.hoursPerDay}</label>
        <input
          id="hoursPerDay"
          type="range"
          min={0.5}
          max={6}
          step={0.5}
          value={formData.studyTime.hoursPerDay}
          onChange={(event) => onStudyTimeChange('hoursPerDay', Number(event.target.value))}
        />
      </div>

      <div className="field">
        <label>Sessions Per Day</label>
        <div className="topic-chip-row">
          {[1, 2, 3].map((value) => (
            <button
              key={value}
              type="button"
              className={`topic-chip${formData.studyTime.sessionsPerDay === value ? ' active' : ''}`}
              onClick={() => onStudyTimeChange('sessionsPerDay', value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Preferred Session</label>
        <div className="topic-chip-row">
          {SESSION_TYPES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`topic-chip${formData.studyTime.sessionType === option.value ? ' active' : ''}`}
              onClick={() => onStudyTimeChange('sessionType', option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Available Days</label>
        <div className="topic-chip-row topic-chip-days">
          {DAY_OPTIONS.map((day) => (
            <button
              key={day.value}
              type="button"
              className={`topic-chip${formData.availableDays.includes(day.value) ? ' active' : ''}`}
              onClick={() => onToggleAvailableDay(day.value)}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Step3Time
