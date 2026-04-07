import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteUserAccount, getUserProfile, updateUserProfile } from '../api'
import HomeLayout from '../components/layout/HomeLayout'
import { clearAuthSession, setAuthUser } from '../utils/authStorage'
import {
  buildProfilePayload,
  DEFAULT_WEEKLY_DAYS,
  INTEREST_OPTIONS,
  STUDY_TIME_OPTIONS,
  toProfileFormState,
  validateProfileForm,
  WEEKDAY_OPTIONS,
} from '../utils/profilePreferences'

function ProfilePage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState(toProfileFormState(null))
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await getUserProfile()
        const user = response?.data?.user
        setFormData(toProfileFormState(user))
        setAuthUser(user)
      } catch (error) {
        setStatus({
          type: 'error',
          message: error?.response?.data?.message || 'Failed to load profile.',
        })
      }
    }

    loadProfile()
  }, [])

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

  const handleSave = async (event) => {
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
      setFormData(toProfileFormState(response?.data?.user))
      setStatus({ type: 'success', message: 'Profile updated successfully.' })
    } catch (error) {
      setStatus({
        type: 'error',
        message: error?.response?.data?.message || 'Failed to update profile.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm('Are you sure you want to delete your account?')
    if (!confirmed) {
      return
    }

    try {
      setIsDeleting(true)
      await deleteUserAccount()
      clearAuthSession()
      navigate('/login', { replace: true })
    } catch (error) {
      setStatus({
        type: 'error',
        message: error?.response?.data?.message || 'Failed to delete account.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <HomeLayout title="Profile" subtitle="Manage your personal learning profile.">
      <article className="feature-card profile-card">
        <form className="form-grid" onSubmit={handleSave}>
          <div className="field">
            <label htmlFor="profileName">Name</label>
            <input
              id="profileName"
              value={formData.name}
              onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="profileGender">Gender</label>
            <input
              id="profileGender"
              value={formData.gender}
              onChange={(event) => setFormData((prev) => ({ ...prev, gender: event.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="profileDob">Date of Birth</label>
            <input
              id="profileDob"
              type="date"
              value={formData.dob}
              onChange={(event) => setFormData((prev) => ({ ...prev, dob: event.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="profileInterests">Interests</label>
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
                    name="profileStudyTimeSlot"
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
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Update Profile'}
          </button>
        </form>
        <button className="btn btn-danger" type="button" disabled={isDeleting} onClick={handleDelete}>
          {isDeleting ? 'Deleting...' : 'Delete Account'}
        </button>
        {status.message ? <p className={`status status-${status.type}`}>{status.message}</p> : null}
      </article>
    </HomeLayout>
  )
}

export default ProfilePage
