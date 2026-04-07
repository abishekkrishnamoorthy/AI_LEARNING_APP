/* eslint-disable react/prop-types */
function Step1Basic({ formData, onFieldChange }) {
  return (
    <div className="topic-step-content">
      <h3>Basic Info</h3>
      <p>Give your topic a clear identity.</p>

      <div className="field">
        <label htmlFor="topicTitle">Title</label>
        <input
          id="topicTitle"
          value={formData.title}
          onChange={(event) => onFieldChange('title', event.target.value)}
          placeholder="e.g. Generative AI Fundamentals"
        />
      </div>

      <div className="field">
        <label htmlFor="topicDescription">Description</label>
        <textarea
          id="topicDescription"
          className="topic-textarea"
          value={formData.description}
          onChange={(event) => onFieldChange('description', event.target.value)}
          placeholder="Add a short description for this learning topic."
          rows={4}
        />
      </div>

      <div className="field">
        <label htmlFor="topicLevel">Level</label>
        <select
          id="topicLevel"
          className="topic-select"
          value={formData.level}
          onChange={(event) => onFieldChange('level', event.target.value)}
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>
    </div>
  )
}

export default Step1Basic
