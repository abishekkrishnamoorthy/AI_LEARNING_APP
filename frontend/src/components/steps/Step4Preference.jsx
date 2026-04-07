/* eslint-disable react/prop-types */
const LEARNING_STYLE_OPTIONS = [
  { value: 'video', label: 'Video' },
  { value: 'reading', label: 'Reading' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'practice', label: 'Practice' },
]

const FOCUS_LEVEL_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'intensive', label: 'Intensive' },
]

const PRIOR_KNOWLEDGE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
]

const ASSESSMENT_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
]

function CardGroup({ title, options, selectedValue, onSelect }) {
  return (
    <div className="field">
      <label>{title}</label>
      <div className="topic-card-grid">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`topic-option-card${selectedValue === option.value ? ' active' : ''}`}
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Step4Preference({ formData, onFieldChange }) {
  return (
    <div className="topic-step-content">
      <h3>Preferences</h3>
      <p>Choose your learning and assessment preferences.</p>

      <CardGroup
        title="Learning Style"
        options={LEARNING_STYLE_OPTIONS}
        selectedValue={formData.learningStyle}
        onSelect={(value) => onFieldChange('learningStyle', value)}
      />
      <CardGroup
        title="Focus Level"
        options={FOCUS_LEVEL_OPTIONS}
        selectedValue={formData.focusLevel}
        onSelect={(value) => onFieldChange('focusLevel', value)}
      />
      <CardGroup
        title="Prior Knowledge"
        options={PRIOR_KNOWLEDGE_OPTIONS}
        selectedValue={formData.priorKnowledge}
        onSelect={(value) => onFieldChange('priorKnowledge', value)}
      />
      <CardGroup
        title="Assessment Preference"
        options={ASSESSMENT_OPTIONS}
        selectedValue={formData.assessmentPreference}
        onSelect={(value) => onFieldChange('assessmentPreference', value)}
      />
    </div>
  )
}

export default Step4Preference
