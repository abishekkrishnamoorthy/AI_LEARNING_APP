/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react'
import { generateSummary, getSummary, getTopics, saveSummaryNotes } from '../../api'
import { useDraftNotes } from '../../hooks/useDraftNotes'
import { getAuthToken } from '../../utils/authStorage'

function SummaryPage({
  dailyLogId,
  topicId,
  cycleId,
  dayNumber,
  subtopic,
  onStartNextDay,
  onViewCycleReport,
}) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [topicName, setTopicName] = useState('')
  const [cycleNumber, setCycleNumber] = useState(1)
  const [noteSaved, setNoteSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const { getDraft, clearDraft } = useDraftNotes(cycleId, dayNumber)
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

  useEffect(() => {
    if (!dailyLogId) return
    generateSummary(dailyLogId).catch(() => {
      // Queue may already have a job for this log.
    })
  }, [dailyLogId])

  useEffect(() => {
    if (!topicId) return

    const loadTopicMeta = async () => {
      try {
        const response = await getTopics()
        const topics = response?.data?.data || []
        const topic = topics.find((item) => String(item?._id) === String(topicId))
        if (!topic) return

        setTopicName(topic?.name || '')
        const activeCycleNumber = Number(topic?.currentCycle?.cycleNumber || 1)
        setCycleNumber(Number.isFinite(activeCycleNumber) ? activeCycleNumber : 1)
      } catch {
        // Keep fallbacks for save payload.
      }
    }

    loadTopicMeta()
  }, [topicId])

  useEffect(() => {
    if (!dailyLogId) return

    let timer
    const poll = async () => {
      const response = await getSummary(dailyLogId)
      const payload = response?.data?.data || {}
      setSummary(payload)

      if (!payload.generatedAt) {
        timer = setTimeout(poll, 3000)
      } else {
        setLoading(false)
      }
    }

    poll()

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [dailyLogId])

  const combinedScore = Number(summary?.combinedScore || 0)
  const quizScore = Number(summary?.quizScore || 0)
  const depthScore = Number(summary?.depthScore || 0)

  const scoreTone = useMemo(() => {
    if (combinedScore >= 80) return { stroke: '#2f7d54', badge: 'bg-green-100 text-green-700' }
    if (combinedScore >= 60) return { stroke: '#b7791f', badge: 'bg-amber-100 text-amber-700' }
    return { stroke: '#b54747', badge: 'bg-red-100 text-red-700' }
  }, [combinedScore])

  const circumference = 2 * Math.PI * 42
  const dashOffset = circumference - (Math.max(0, Math.min(100, combinedScore)) / 100) * circumference

  const handleDownloadPdf = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${apiBaseUrl}/api/notes/download/pdf/draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          topicName: topicName || `Topic-${String(topicId || '').slice(0, 6)}`,
          cycleNumber: Number(cycleNumber) || 1,
          dayNumber: Number(dayNumber),
          subtopic: subtopic || 'Learning session',
          content: getDraft(),
          aiSummary: (summary?.keyToRemember || []).join(' | ') || '',
          takeaways: Array.isArray(summary?.takeaways) ? summary.takeaways : [],
        }),
      })
      if (!response.ok) throw new Error('PDF download failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `day-${dayNumber}-notes.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF download error:', error)
      alert('Could not download PDF. Please try again.')
    }
  }

  const handleSaveNotes = async () => {
    if (isSaving) return
    setIsSaving(true)
    setSaveError('')
    const draft = getDraft()

    try {
      await saveSummaryNotes({
        topicId,
        topicName: topicName || `Topic-${String(topicId || '').slice(0, 6)}`,
        cycleId,
        cycleNumber: Number(cycleNumber) || 1,
        dayNumber: Number(dayNumber),
        subtopic: subtopic || 'Learning session',
        content: draft,
        aiSummary: (summary?.keyToRemember || []).join(' | ') || '',
        takeaways: Array.isArray(summary?.takeaways) ? summary.takeaways : [],
      })
      clearDraft()
      setNoteSaved(true)
    } catch (error) {
      console.error('Note save error:', error)
      setSaveError(error?.response?.data?.error || 'Could not save notes. Your draft is still safe locally.')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="space-y-4 rounded-3xl border border-[var(--bgray)] bg-white p-6 shadow-sm">
        <div className="h-6 w-56 animate-pulse rounded bg-[var(--lgray)]" />
        <div className="h-20 animate-pulse rounded-xl bg-[var(--lgray)]" />
        <div className="h-20 animate-pulse rounded-xl bg-[var(--lgray)]" />
        <div className="h-20 animate-pulse rounded-xl bg-[var(--lgray)]" />
      </section>
    )
  }

  return (
    <section className="rounded-3xl border border-[var(--bgray)] bg-white p-6 shadow-sm">
      <h2 className="font-heading text-3xl text-[var(--dark)]">Daily Summary</h2>

      <div className="mt-4">
        <h3 className="font-heading text-xl text-[var(--dark)]">Takeaways</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--dark)]">
          {(summary?.takeaways || []).slice(0, 3).map((item, idx) => (
            <li key={`takeaway-${idx}`}>{item}</li>
          ))}
        </ul>

        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            background: '#F4F3FA',
            borderRadius: '12px',
            border: '1px solid #E0E0E0',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#1A1A1A', marginBottom: '6px' }}>
            Save your notes
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px', lineHeight: 1.5 }}>
            Your draft notes + AI summary will be saved permanently to your Notes page for future reference.
          </div>
          {noteSaved ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#1D9E75' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1D9E75' }} />
              Notes saved to your Documents
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={isSaving}
              style={{
                padding: '8px 20px',
                background: isSaving ? '#C8B8F0' : '#7B5EA7',
                color: '#fff',
                border: 'none',
                borderRadius: '9px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {isSaving ? 'Saving...' : 'Save notes to Documents'}
            </button>
          )}
          {saveError ? (
            <div style={{ marginTop: '10px', fontSize: '12px', lineHeight: 1.45, color: '#B54747' }}>{saveError}</div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-[var(--bgray)] bg-[var(--lgray)] p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Quiz</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full bg-[var(--blue)]" style={{ width: `${Math.min(100, (quizScore / 10) * 100)}%` }} />
          </div>
          <p className="mt-2 text-sm text-[var(--dark)]">{quizScore}/10</p>
        </article>

        <article className="rounded-xl border border-[var(--bgray)] bg-[var(--lgray)] p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Depth</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full bg-[var(--cta)]" style={{ width: `${Math.min(100, (depthScore / 5) * 100)}%` }} />
          </div>
          <p className="mt-2 text-sm text-[var(--dark)]">{depthScore}/5</p>
        </article>

        <article className="flex items-center justify-center rounded-xl border border-[var(--bgray)] bg-[var(--lgray)] p-4">
          <div className="relative h-28 w-28">
            <svg width="112" height="112" viewBox="0 0 112 112">
              <circle cx="56" cy="56" r="42" stroke="#e3e3e3" strokeWidth="10" fill="none" />
              <circle
                cx="56"
                cy="56"
                r="42"
                stroke={scoreTone.stroke}
                strokeWidth="10"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(-90 56 56)"
                style={{ transition: 'stroke-dashoffset 900ms ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-heading text-2xl text-[var(--dark)]">
              {combinedScore}%
            </div>
          </div>
        </article>
      </div>

      <div className="mt-6">
        <h3 className="font-heading text-xl text-[var(--dark)]">Key to Remember</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          {(summary?.keyToRemember || []).map((item, idx) => (
            <article
              key={`remember-${idx}`}
              className="rounded-xl border-l-4 border-[var(--palm)] bg-[var(--lgray)] p-3 text-sm text-[var(--dark)]"
            >
              {item}
            </article>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${scoreTone.badge}`}>
          {(summary?.performanceRating || 'average').replace('_', ' ').toUpperCase()}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="rounded-xl border border-[var(--bgray)] px-4 py-2 text-sm font-medium text-[var(--dark)]"
        >
          Download PDF
        </button>

        {Number(dayNumber) < 5 ? (
          <button
            type="button"
            onClick={onStartNextDay}
            className="rounded-xl bg-[var(--cta)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--cta-hover)]"
          >
            Start Day {Number(dayNumber) + 1}
          </button>
        ) : (
          <button
            type="button"
            onClick={onViewCycleReport}
            className="rounded-xl bg-[var(--cta)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--cta-hover)]"
          >
            View Cycle Report
          </button>
        )}
      </div>
    </section>
  )
}

export default SummaryPage
