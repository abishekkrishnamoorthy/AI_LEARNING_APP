/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

const BANNER_GRADIENTS = [
  'linear-gradient(135deg, #4A90E2, #7B5EA7)',
  'linear-gradient(135deg, #C8A2C8, #9B7EC8)',
  'linear-gradient(135deg, #1D9E75, #4A90E2)',
  'linear-gradient(135deg, #E8593C, #C8A2C8)',
  'linear-gradient(135deg, #BA7517, #E8593C)',
]

const GOAL_LABEL = {
  interview: 'Interview prep',
  competitive: 'Exam prep',
  academic: 'Academic',
  project: 'Skill building',
}

const STATUS_META = {
  active: { label: 'Active', className: 'active' },
  completed: { label: 'Completed', className: 'completed' },
  pending: { label: 'Pending', className: 'pending' },
  generating: { label: 'Generating...', className: 'pending' },
  failed: { label: 'Failed', className: 'failed' },
}

function TopicCard({ topic, onRetry, onDelete }) {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  const navigate = useNavigate()
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const queryClient = useQueryClient()
  const status = topic?.status || 'pending'
  const bannerIndex = Number(topic?.bannerIndex ?? 0) % 5
  const percent = Math.max(0, Math.min(100, Number(topic?.completionPercent || 0)))
  const statusMeta = STATUS_META[status] || STATUS_META.pending

  const cycleNumber = Number(topic?.currentCycle?.cycleNumber || 1)
  const currentDay = Number(topic?.currentCycle?.currentDay || 1)
  const cycleId = topic?.currentCycle?.cycleId

  const handlePrimaryAction = () => {
    if (status === 'active') {
      if (!cycleId) {
        navigate('/topics')
        return
      }
      navigate(`/topic/${topic._id}/cycle/${cycleId}/day/${currentDay || 1}`)
      return
    }

    if (status === 'completed') {
      navigate(`/topic/${topic._id}/report`)
      return
    }

    if (status === 'failed') {
      onRetry?.(topic._id)
      return
    }

    navigate(`/topics/create/status/${topic._id}`)
  }

  const footerMeta =
    status === 'active'
      ? cycleNumber === 1 && currentDay === 1
        ? 'Cycle 1 · Day 1'
        : `Cycle ${cycleNumber} · Day ${currentDay}`
      : status === 'completed'
        ? '100% done'
        : status === 'failed'
          ? 'Plan failed'
          : 'Generating plan...'

  const actionLabel =
    status === 'active'
      ? cycleNumber === 1 && currentDay === 1
        ? 'Start today'
        : 'Continue'
      : status === 'completed'
        ? 'View report'
        : status === 'failed'
          ? 'Retry'
          : 'Check status'

  const canDelete = ['active', 'pending', 'failed'].includes(status)

  useEffect(() => {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('jwt') ||
      localStorage.getItem('auth_token')
    console.log('Auth token present:', !!token, '| topic:', topic._id)
  }, [topic._id])

  async function handleDelete(e) {
    if (e) e.stopPropagation()
    setIsDeleting(true)

    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('jwt') ||
      localStorage.getItem('auth_token') ||
      ''

    if (!token) {
      console.error('No auth token found in localStorage')
      setIsDeleting(false)
      setShowConfirm(false)
      return
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/topic/${topic._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      const raw = await res.text()
      let data = {}
      if (raw) {
        try {
          data = JSON.parse(raw)
        } catch {
          data = { error: raw }
        }
      }
      console.log('Delete response:', res.status, data)

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      setShowConfirm(false)
      setIsDeleting(false)
      await queryClient.invalidateQueries({ queryKey: ['topics'] })
      if (onDelete) onDelete(topic._id, topic.name)
    } catch (err) {
      console.error('Delete failed:', err.message)
      alert(`Delete failed: ${err.message}`)
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  return (
    <article
      className="topic-card"
      style={{
        position: 'relative',
        opacity: isDeleting ? 0.4 : 1,
        pointerEvents: isDeleting ? 'none' : 'auto',
        transition: 'opacity 0.3s',
      }}
    >
      {showConfirm && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.97)',
            zIndex: 10,
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '18px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#FFF0F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 7v4M10 13.5h.01" stroke="#e05a5a" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="10" cy="10" r="8" stroke="#e05a5a" strokeWidth="1.4" />
            </svg>
          </div>

          <p style={{ fontSize: '13px', fontWeight: 500, color: '#1A1A1A', margin: 0 }}>Delete this topic?</p>

          <p style={{ fontSize: '11px', color: '#888', lineHeight: 1.5, margin: 0 }}>
            {['pending', 'generating', 'failed'].includes(topic.status)
              ? 'Plan is still generating. Deleting will cancel it and free 1 slot.'
              : 'All cycle progress will be removed. This frees up 1 slot.'}
          </p>

          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowConfirm(false)
              }}
              disabled={isDeleting}
              style={{
                flex: 1,
                padding: '7px',
                background: '#F5F5F5',
                color: '#666',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(e)
              }}
              disabled={isDeleting}
              style={{
                flex: 1,
                padding: '7px',
                background: isDeleting ? '#f0a0a0' : '#e05a5a',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.12s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M2 3.5h10M5.5 3.5v-1h3v1M5.5 6v4M8.5 6v4M3 3.5l.7 8.5h6.6L11 3.5"
                  stroke="#fff"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      <div className="topic-card-banner" style={{ background: BANNER_GRADIENTS[bannerIndex] }}>
        {canDelete && topic.status !== 'completed' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowConfirm(true)
            }}
            title="Delete topic"
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              background: 'rgba(255,255,255,0.92)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.15s, background 0.15s',
              zIndex: 3,
            }}
            className="card-delete-btn"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 3.5h10M5.5 3.5v-1h3v1M5.5 6v4M8.5 6v4M3 3.5l.7 8.5h6.6L11 3.5"
                stroke="#888"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <span className={`topic-status-pill ${statusMeta.className}`}>{statusMeta.label}</span>
        <div className="topic-banner-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-13Z"
              stroke="#7B5EA7"
              strokeWidth="1.5"
            />
            <path d="M8 8h8M8 12h8M8 16h5" stroke="#7B5EA7" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="topic-progress-strip" style={{ width: `${percent}%` }} />
      </div>

      <div className="topic-card-body">
        <p className="topic-goal-label">{GOAL_LABEL[topic?.goal] || 'Skill building'}</p>
        <h3 className="topic-card-title" title={topic?.name}>
          {topic?.name}
        </h3>
        <p className="topic-card-description">{topic?.description || 'No description provided'}</p>

        <div className="topic-meta-row">
          <span>{topic?.durationDays || 0} days</span>
          <span>{topic?.dailyMinutes || 0} min/day</span>
          <span>{topic?.level || '-'}</span>
        </div>

        <div className="topic-card-footer">
          <span className={`topic-footer-meta ${status}`}>{footerMeta}</span>
          <button
            type="button"
            className={`topic-action-btn ${status}`}
            onClick={handlePrimaryAction}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </article>
  )
}

export default TopicCard
