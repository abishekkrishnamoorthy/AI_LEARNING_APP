export const WEEKDAY_OPTIONS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
]

export const STUDY_TIME_OPTIONS = [
  { value: 'forenoon', label: 'Forenoon' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
]

export const INTEREST_OPTIONS = [
  { value: 'machine-learning', label: 'Machine Learning' },
  { value: 'deep-learning', label: 'Deep Learning' },
  { value: 'nlp', label: 'NLP' },
  { value: 'computer-vision', label: 'Computer Vision' },
  { value: 'data-science', label: 'Data Science' },
  { value: 'ai-tools', label: 'AI Tools' },
]

export const DEFAULT_WEEKLY_DAYS = WEEKDAY_OPTIONS.map((day) => day.value)
export const DEFAULT_STUDY_TIME_SLOT = STUDY_TIME_OPTIONS[0].value

const normalizeList = (value) => (Array.isArray(value) ? [...new Set(value.filter(Boolean))] : [])

const normalizeWeeklyDays = (value) => {
  const selected = normalizeList(value).map((day) => String(day).toLowerCase())
  return WEEKDAY_OPTIONS.map((day) => day.value).filter((weekday) => selected.includes(weekday))
}

const normalizeInterests = (value) => {
  const selected = normalizeList(value).map((interest) => String(interest).toLowerCase())
  return INTEREST_OPTIONS.map((interest) => interest.value).filter((interest) => selected.includes(interest))
}

export const toProfileFormState = (user) => ({
  name: user?.name || '',
  gender: user?.gender || '',
  dob: user?.dob ? new Date(user.dob).toISOString().slice(0, 10) : '',
  profilePic: user?.profilePic || '',
  interestsList: normalizeInterests(user?.interestsList),
  weeklyDays:
    normalizeWeeklyDays(user?.preferences?.weeklyDays).length > 0
      ? normalizeWeeklyDays(user?.preferences?.weeklyDays)
      : [...DEFAULT_WEEKLY_DAYS],
  studyTimeSlot: STUDY_TIME_OPTIONS.some((slot) => slot.value === user?.preferences?.studyTimeSlot)
    ? user.preferences.studyTimeSlot
    : DEFAULT_STUDY_TIME_SLOT,
})

const isFutureDate = (dateString) => {
  const parsed = new Date(dateString)
  if (Number.isNaN(parsed.getTime())) {
    return false
  }
  return parsed.getTime() > Date.now()
}

export const validateProfileForm = (formData) => {
  const trimmedName = formData.name.trim()
  if (!trimmedName) {
    return 'Name is required.'
  }

  if (formData.dob) {
    const parsedDob = new Date(formData.dob)
    if (Number.isNaN(parsedDob.getTime())) {
      return 'Date of birth must be a valid date.'
    }

    if (isFutureDate(formData.dob)) {
      return 'Date of birth cannot be in the future.'
    }
  }

  if (!Array.isArray(formData.interestsList) || formData.interestsList.length === 0) {
    return 'Select at least one interest.'
  }

  if (!Array.isArray(formData.weeklyDays) || formData.weeklyDays.length === 0) {
    return 'Select at least one weekly availability day.'
  }

  if (!STUDY_TIME_OPTIONS.some((slot) => slot.value === formData.studyTimeSlot)) {
    return 'Select a valid study time slot.'
  }

  return ''
}

export const buildProfilePayload = (formData) => ({
  name: formData.name.trim(),
  gender: formData.gender.trim(),
  dob: formData.dob || null,
  profilePic: formData.profilePic.trim(),
  interestsList: [...formData.interestsList],
  preferences: {
    weeklyDays: [...formData.weeklyDays],
    studyTimeSlot: formData.studyTimeSlot,
    notificationChannel: 'email',
  },
})
