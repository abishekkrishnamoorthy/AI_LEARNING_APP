/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react'
import { generateSummary, getNotes, getSummary } from '../../api'

function SummaryPage({ dailyLogId, dayNumber, onStartNextDay, onViewCycleReport }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!dailyLogId) return
    generateSummary(dailyLogId).catch(() => {
      // Queue may already have a job for this log.
    })
  }, [dailyLogId])

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

  const handleDownloadNotes = async () => {
    const response = await getNotes(dailyLogId)
    const content = response?.data?.data?.content || ''
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `day-${dayNumber}-notes.txt`
    link.click()
    URL.revokeObjectURL(url)
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
            <article key={`remember-${idx}`} className="rounded-xl border-l-4 border-[var(--palm)] bg-[var(--lgray)] p-3 text-sm text-[var(--dark)]">
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
          onClick={handleDownloadNotes}
          className="rounded-xl border border-[var(--bgray)] px-4 py-2 text-sm font-medium text-[var(--dark)]"
        >
          Download notes as .txt
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
