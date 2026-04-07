import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateUserProfile } from '../api'
import { setAuthUser } from '../utils/authStorage'
import {
  buildProfilePayload,
  DEFAULT_WEEKLY_DAYS,
  INTEREST_OPTIONS,
  STUDY_TIME_OPTIONS,
  toProfileFormState,
  validateProfileForm,
  WEEKDAY_OPTIONS,
} from '../utils/profilePreferences'

function ProfileSetupPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState(toProfileFormState(null))
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isSaving, setIsSaving] = useState(false)

  const handleWeeklyDayToggle = (day) => {
    setFormData((prev) => {
      const selected = prev.weeklyDays.includes(day)
        ? prev.weeklyDays.filter((item) => item !== day)
        : [...prev.weeklyDays, day]
      return { ...prev, weeklyDays: selected }
    })
  }

  const handleInterestToggle = (interest) => {
    setFormData((prev) => {
      const selected = prev.interestsList.includes(interest)
        ? prev.interestsList.filter((item) => item !== interest)
        : [...prev.interestsList, interest]
      return { ...prev, interestsList: selected }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus({ type: '', message: '' })

    const validationError = validateProfileForm(formData)
    if (validationError) {
      setStatus({ type: 'error', message: validationError })
      return
    }

    try {
      setIsSaving(true)
      const response = await updateUserProfile(buildProfilePayload(formData))
      setAuthUser(response?.data?.user)
      navigate('/home', { replace: true })
    } catch (error) {
      setStatus({
        type: 'error',
        message: error?.response?.data?.message || 'Failed to save profile.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="app-shell page">
      <section className="card profile-setup-card">
        <h1 className="page-title">Complete Your Profile</h1>
        <p className="page-subtitle">Set up your learning profile before entering Module 2.</p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              value={formData.name}
              onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Your name"
            />
          </div>

          <div className="field">
            <label htmlFor="gender">Gender</label>
            <input
              id="gender"
              value={formData.gender}
              onChange={(event) => setFormData((prev) => ({ ...prev, gender: event.target.value }))}
              placeholder="Gender"
            />
          </div>

          <div className="field">
            <label htmlFor="dob">Date of Birth</label>
            <input
              id="dob"
              type="date"
              value={formData.dob}
              onChange={(event) => setFormData((prev) => ({ ...prev, dob: event.target.value }))}
            />
          </div>

          <div className="field">
            <label>Interests</label>
            <div className="choice-grid">
              {INTEREST_OPTIONS.map((interest) => (
                <label key={interest.value} className="choice-item">
                  <input
                    type="checkbox"
                    checked={formData.interestsList.includes(interest.value)}
                    onChange={() => handleInterestToggle(interest.value)}
                  />
                  <span>{interest.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Weekly Availability</label>
            <div className="choice-grid">
              {WEEKDAY_OPTIONS.map((day) => (
                <label key={day.value} className="choice-item">
                  <input
                    type="checkbox"
                    checked={formData.weeklyDays.includes(day.value)}
                    onChange={() => handleWeeklyDayToggle(day.value)}
                  />
                  <span>{day.label}</span>
                </label>
              ))}
            </div>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, weeklyDays: [...DEFAULT_WEEKLY_DAYS] }))}
            >
              Select All Days
            </button>
          </div>

          <div className="field">
            <label>Study Time</label>
            <div className="choice-grid">
              {STUDY_TIME_OPTIONS.map((slot) => (
                <label key={slot.value} className="choice-item">
                  <input
                    type="radio"
                    name="studyTimeSlot"
                    checked={formData.studyTimeSlot === slot.value}
                    onChange={() => setFormData((prev) => ({ ...prev, studyTimeSlot: slot.value }))}
                  />
                  <span>{slot.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="profilePic">Profile Picture URL</label>
            <input
              id="profilePic"
              value={formData.profilePic}
              onChange={(event) => setFormData((prev) => ({ ...prev, profilePic: event.target.value }))}
              placeholder="https://..."
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>

        {status.message ? <p className={`status status-${status.type}`}>{status.message}</p> : null}
      </section>
    </main>
  )
}

export default ProfileSetupPage
