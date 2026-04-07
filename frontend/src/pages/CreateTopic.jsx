import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import FormField from '../components/FormField'
import GoalRadioGroup from '../components/GoalRadioGroup'
import HomeLayout from '../components/layout/HomeLayout'
import PillSelect from '../components/PillSelect'
import TopicPreviewPanel from '../components/TopicPreviewPanel'
import { createTopic, getTopicStatus, getTopics } from '../api'

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

const DAILY_TIME_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hrs' },
  { value: 120, label: '2 hrs' },
]

const initialForm = {
  name: '',
  description: '',
  level: 'beginner',
  goal: '',
  durationDays: 30,
  dailyMinutes: 60,
}

const validateForm = (form) => {
  const errors = {}
  const name = form.name.trim()
  const description = form.description.trim()
  const durationDays = Number(form.durationDays)

  if (!name) errors.name = 'Topic name is required.'
  else if (name.length < 3 || name.length > 80) errors.name = 'Topic name must be 3-80 chars.'

  if (!description) errors.description = 'Description is required.'
  else if (description.length < 20 || description.length > 500) errors.description = 'Description must be 20-500 chars.'

  if (!form.level) errors.level = 'Difficulty level is required.'
  if (!form.goal) errors.goal = 'Primary goal is required.'
  if (!Number.isInteger(durationDays) || durationDays < 5 || durationDays > 180) {
    errors.durationDays = 'Duration must be an integer between 5 and 180.'
  }

  if (![30, 60, 90, 120].includes(Number(form.dailyMinutes))) {
    errors.dailyMinutes = 'Daily study time is required.'
  }

  return errors
}

function CreateTopic() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [isValidating, setIsValidating] = useState(false)
  const [createdTopicId, setCreatedTopicId] = useState('')
  const [topicState, setTopicState] = useState('')
  const [submitError, setSubmitError] = useState('')

  const { data: topicsResponse, isLoading: isTopicsLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: getTopics,
  })

  const topics = useMemo(() => topicsResponse?.data?.data || [], [topicsResponse])
  const slotCount = useMemo(
    () => topics.filter((topic) => ['pending', 'generating', 'active'].includes(topic.status)).length,
    [topics]
  )
  const atLimit = slotCount >= 3

  const createMutation = useMutation({
    mutationFn: createTopic,
    onSuccess: (response) => {
      const data = response?.data?.data
      if (!data?.topicId) {
        setSubmitError('Topic created, but topic ID is missing.')
        return
      }
      setCreatedTopicId(String(data.topicId))
      setTopicState(String(data.status || 'pending'))
      setSubmitError('')
    },
    onError: (error) => {
      setSubmitError(error?.response?.data?.message || 'Failed to create topic.')
    },
  })

  useEffect(() => {
    if (!createdTopicId) return undefined

    const timer = setInterval(async () => {
      try {
        const response = await getTopicStatus(createdTopicId)
        const status = response?.data?.data?.status
        setTopicState(String(status || 'pending'))
        if (status === 'active') {
          clearInterval(timer)
          navigate('/topics')
        }
      } catch {
        // Keep polling; transient failures should not break flow.
      }
    }, 3000)

    return () => clearInterval(timer)
  }, [createdTopicId, navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    setIsValidating(true)
    const validationErrors = validateForm(form)
    setErrors(validationErrors)
    setIsValidating(false)

    if (Object.keys(validationErrors).length > 0 || atLimit) return
    createMutation.mutate({
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      durationDays: Number(form.durationDays),
      dailyMinutes: Number(form.dailyMinutes),
    })
  }

  const isSubmitting = isValidating || createMutation.isPending || Boolean(createdTopicId)

  return (
    <HomeLayout
      title="Create Topic"
      subtitle="Build your adaptive learning track. The generated plan is structured in 5-day cycles."
      showCreateTopicButton={false}
    >
      <div className="space-y-5">
        <div className="rounded-3xl border border-[var(--bgray)] bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Topic Slots</p>
          <p className="mt-1 text-sm text-[var(--dark)]">{slotCount}/3 active or pending</p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <section className="flex-1 rounded-3xl border border-[var(--bgray)] bg-white p-6 shadow-sm">
            {isTopicsLoading ? <p className="text-sm text-slate-500">Loading topics...</p> : null}

            {atLimit ? (
              <div className="rounded-xl border border-[var(--bgray)] bg-[var(--lgray)] p-4">
                <p className="text-sm font-semibold text-[var(--dark)]">Delete a topic to add another.</p>
              </div>
            ) : null}

            <form className="mt-2 space-y-5" onSubmit={handleSubmit}>
              <FormField label="Topic name" htmlFor="name" error={errors.name}>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  disabled={isSubmitting || atLimit}
                  className="w-full rounded-xl border border-[var(--bgray)] px-3 py-2 text-sm outline-none focus:border-[var(--blue)]"
                />
              </FormField>

              <FormField label="Description" htmlFor="description" error={errors.description}>
                <textarea
                  id="description"
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  disabled={isSubmitting || atLimit}
                  placeholder="Describe what you want to learn so AI can tailor depth, order, and weak-topic reviews."
                  className="w-full rounded-xl border border-[var(--bgray)] px-3 py-2 text-sm outline-none focus:border-[var(--blue)]"
                />
              </FormField>

              <FormField label="Difficulty level" htmlFor="level" error={errors.level}>
                <PillSelect
                  options={LEVEL_OPTIONS}
                  value={form.level}
                  onChange={(value) => setForm((prev) => ({ ...prev, level: value }))}
                  disabled={isSubmitting || atLimit}
                />
              </FormField>

              <FormField label="Duration" htmlFor="durationDays" error={errors.durationDays}>
                <input
                  id="durationDays"
                  type="number"
                  min={5}
                  max={180}
                  value={form.durationDays}
                  onChange={(event) => setForm((prev) => ({ ...prev, durationDays: Number(event.target.value) }))}
                  disabled={isSubmitting || atLimit}
                  className="w-full rounded-xl border border-[var(--bgray)] px-3 py-2 text-sm outline-none focus:border-[var(--blue)]"
                />
              </FormField>

              <FormField label="Daily study time" htmlFor="dailyMinutes" error={errors.dailyMinutes}>
                <PillSelect
                  options={DAILY_TIME_OPTIONS}
                  value={Number(form.dailyMinutes)}
                  onChange={(value) => setForm((prev) => ({ ...prev, dailyMinutes: value }))}
                  disabled={isSubmitting || atLimit}
                />
              </FormField>

              <FormField label="Primary goal" htmlFor="goal" error={errors.goal}>
                <GoalRadioGroup
                  value={form.goal}
                  onChange={(value) => setForm((prev) => ({ ...prev, goal: value }))}
                  disabled={isSubmitting || atLimit}
                />
              </FormField>

              {submitError ? <p className="text-[11px] text-red-600">{submitError}</p> : null}

              {createdTopicId ? (
                <div className="flex items-center gap-2 rounded-xl bg-[var(--lpurple)] px-4 py-3 text-sm text-[var(--dark)]">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--blue)]" />
                  Generating your plan... ({topicState || 'pending'})
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => navigate('/home')}
                  className="rounded-xl border border-[var(--bgray)] px-4 py-2 text-sm font-medium text-[var(--dark)]"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || atLimit}
                  className="rounded-xl bg-[var(--cta)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--cta-hover)] disabled:opacity-60"
                >
                  {isSubmitting ? 'Generating...' : 'Generate 5-day plan ->'}
                </button>
              </div>
            </form>
          </section>

          <TopicPreviewPanel topics={topics} />
        </div>
      </div>
    </HomeLayout>
  )
}

export default CreateTopic
