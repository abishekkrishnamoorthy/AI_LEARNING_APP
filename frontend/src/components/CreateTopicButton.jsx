/* eslint-disable react/prop-types */
function CreateTopicButton({ onClick }) {
  return (
    <button type="button" className="create-topic-btn" onClick={onClick}>
      <span className="create-topic-icon" aria-hidden="true">
        +
      </span>
      <span>New Topic</span>
    </button>
  )
}

export default CreateTopicButton
