/* eslint-disable react/prop-types */
function Step5Review({ formData }) {
  return (
    <div className="topic-step-content">
      <h3>Review &amp; Submit</h3>
      <p>Verify your topic setup before creating it.</p>

      <div className="topic-review-grid">
        <article className="topic-review-card">
          <h4>Title</h4>
          <p>{formData.title || '-'}</p>
        </article>
        <article className="topic-review-card">
          <h4>Duration</h4>
          <p>{formData.durationDays || '-'} days</p>
        </article>
        <article className="topic-review-card">
          <h4>Hours/Day</h4>
          <p>{formData.studyTime.hoursPerDay || '-'} hours</p>
        </article>
        <article className="topic-review-card">
          <h4>Level</h4>
          <p>{formData.level || '-'}</p>
        </article>
        <article className="topic-review-card">
          <h4>Goal</h4>
          <p>{formData.goalType || '-'}</p>
        </article>
      </div>
    </div>
  )
}

export default Step5Review
