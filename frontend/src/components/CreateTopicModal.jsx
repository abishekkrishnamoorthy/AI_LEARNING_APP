/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react'
import { createTopic } from '../api'
import Step1Basic from './steps/Step1Basic'
import Step2Goal from './steps/Step2Goal'
import Step3Time from './steps/Step3Time'
import Step4Preference from './steps/Step4Preference'
import Step5Review from './steps/Step5Review'

const MAX_STEP = 5

const initialFormData = {
  title: '',
  description: '',
  level: 'beginner',
  goalType: '',
  durationDays: 30,
  studyTime: {
    hoursPerDay: 2,
    sessionsPerDay: 1,
    sessionType: 'morning',
  },
  availableDays: [],
  learningStyle: '',
  focusLevel: '',
  priorKnowledge: '',
  assessmentPreference: '',
}

const toNumber = (value) => Number(value)

const isStepValid = (step, formData) => {
  if (step === 1) {
    return formData.title.trim().length > 0
  }

  if (step === 2) {
    const duration = toNumber(formData.durationDays)
    return Boolean(formData.goalType) && Number.isFinite(duration) && duration > 0 && duration <= 90
  }

  if (step === 3) {
    const hours = toNumber(formData.studyTime.hoursPerDay)
    const sessions = toNumber(formData.studyTime.sessionsPerDay)
    return (
      Number.isFinite(hours) &&
      hours > 0 &&
      hours <= 6 &&
      Number.isFinite(sessions) &&
      sessions > 0 &&
      sessions <= 3 &&
      formData.availableDays.length > 0
    )
  }

  return true
}

const getValidationError = (formData) => {
  if (!formData.title.trim()) {
    return 'Title is required.'
  }

  const duration = toNumber(formData.durationDays)
  if (!Number.isFinite(duration) || duration <= 0) {
    return 'Duration must be greater than 0.'
  }

  const hours = toNumber(formData.studyTime.hoursPerDay)
  if (!Number.isFinite(hours) || hours > 6 || hours <= 0) {
    return 'Hours per day must be between 0.5 and 6.'
  }

  const sessions = toNumber(formData.studyTime.sessionsPerDay)
  if (!Number.isFinite(sessions) || sessions <= 0 || sessions > 3) {
    return 'Sessions per day must be between 1 and 3.'
  }

  if (!Array.isArray(formData.availableDays) || formData.availableDays.length === 0) {
    return 'Select at least one available day.'
  }

  return ''
}

function CreateTopicModal({ isOpen, onClose, onCreated, onCreateError }) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState(initialFormData)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdTopic, setCreatedTopic] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setStep(1)
    setFormData(initialFormData)
    setErrorMessage('')
    setIsSubmitting(false)
    setCreatedTopic(null)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const onEsc = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [isOpen, onClose])

  const progress = useMemo(() => `${(step / MAX_STEP) * 100}%`, [step])

  if (!isOpen) {
    return null
  }

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleStudyTimeChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      studyTime: {
        ...prev.studyTime,
        [field]: value,
      },
    }))
  }

  const handleToggleAvailableDay = (day) => {
    setFormData((prev) => {
      const alreadySelected = prev.availableDays.includes(day)
      const nextDays = alreadySelected
        ? prev.availableDays.filter((item) => item !== day)
        : [...prev.availableDays, day]
      return { ...prev, availableDays: nextDays }
    })
  }

  const handleNext = () => {
    if (!isStepValid(step, formData)) {
      setErrorMessage('Please complete required fields before continuing.')
      return
    }
    setErrorMessage('')
    setStep((prev) => Math.min(MAX_STEP, prev + 1))
  }

  const handleBack = () => {
    setErrorMessage('')
    setStep((prev) => Math.max(1, prev - 1))
  }

  const handleSubmit = async () => {
    const validationError = getValidationError(formData)
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage('')
      const response = await createTopic(formData)
      const topic = response?.data?.data
      setCreatedTopic(topic)
      onCreated?.(topic)
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to create topic.'
      setErrorMessage(message)
      onCreateError?.(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="topic-modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="topic-modal topic-modal-enter"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-topic-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="topic-modal-close" type="button" onClick={onClose} aria-label="Close">
          x
        </button>

        {createdTopic ? (
          <div className="topic-success-view">
            <h3>Topic Created Successfully</h3>
            <p>
              <strong>{createdTopic?.title || formData.title}</strong> is now saved for your AI learning plan.
            </p>
            <button className="btn btn-primary" type="button" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            <header className="topic-modal-header">
              <h2 id="create-topic-title">Create New Topic</h2>
              <p>
                Step {step}/{MAX_STEP}
              </p>
              <div className="topic-progress-track">
                <span className="topic-progress-fill" style={{ width: progress }} />
              </div>
            </header>

            <div className="topic-modal-body">
              <div className={`topic-step-panel topic-step-${step}`}>
                {step === 1 ? <Step1Basic formData={formData} onFieldChange={handleFieldChange} /> : null}
                {step === 2 ? <Step2Goal formData={formData} onFieldChange={handleFieldChange} /> : null}
                {step === 3 ? (
                  <Step3Time
                    formData={formData}
                    onStudyTimeChange={handleStudyTimeChange}
                    onToggleAvailableDay={handleToggleAvailableDay}
                  />
                ) : null}
                {step === 4 ? <Step4Preference formData={formData} onFieldChange={handleFieldChange} /> : null}
                {step === 5 ? <Step5Review formData={formData} /> : null}
              </div>
            </div>

            {errorMessage ? <p className="status status-error topic-modal-status">{errorMessage}</p> : null}

            <footer className="topic-modal-footer">
              <button className="btn btn-secondary" type="button" onClick={handleBack} disabled={step === 1}>
                Back
              </button>

              {step < MAX_STEP ? (
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={handleNext}
                  disabled={!isStepValid(step, formData)}
                >
                  Next
                </button>
              ) : (
                <button className="btn btn-primary" type="button" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="topic-btn-loading">
                      <span className="topic-spinner" aria-hidden="true" />
                      Creating...
                    </span>
                  ) : (
                    'Create Topic'
                  )}
                </button>
              )}
            </footer>
          </>
        )}
      </section>
    </div>
  )
}

export default CreateTopicModal
