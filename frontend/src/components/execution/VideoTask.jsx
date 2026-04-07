/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { completeTask } from '../../api'
import NotesPanel from './NotesPanel'

let youtubeApiPromise

const loadYoutubeApi = () => {
  if (window.YT?.Player) return Promise.resolve(window.YT)

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve) => {
      const existing = document.querySelector('script[data-youtube-api="true"]')
      if (!existing) {
        const script = document.createElement('script')
        script.src = 'https://www.youtube.com/iframe_api'
        script.async = true
        script.dataset.youtubeApi = 'true'
        document.body.appendChild(script)
      }

      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prev?.()
        resolve(window.YT)
      }
    })
  }

  return youtubeApiPromise
}

function VideoTask({ dailyLogId, cycleId, dayNumber, videoId, videoTitle, onCompleted }) {
  const queryClient = useQueryClient()
  const [leftWidth, setLeftWidth] = useState(30)
  const [progressPercent, setProgressPercent] = useState(0)
  const [markedWatched, setMarkedWatched] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const dividerRef = useRef(null)
  const draggingRef = useRef(false)
  const playerRef = useRef(null)
  const progressTimerRef = useRef(null)
  const playerContainerId = useMemo(() => `yt-player-${Math.random().toString(36).slice(2, 9)}`, [])

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!draggingRef.current) return
      const container = dividerRef.current?.parentElement
      if (!container) return
      const rect = container.getBoundingClientRect()
      const ratio = ((event.clientX - rect.left) / rect.width) * 100
      setLeftWidth(Math.max(20, Math.min(45, ratio)))
    }

    const handleMouseUp = () => {
      draggingRef.current = false
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const setupPlayer = async () => {
      await loadYoutubeApi()
      if (!isMounted) return

      playerRef.current = new window.YT.Player(playerContainerId, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {},
          onStateChange: () => {
            if (progressTimerRef.current) clearInterval(progressTimerRef.current)
            progressTimerRef.current = setInterval(() => {
              try {
                const current = Number(playerRef.current?.getCurrentTime?.() || 0)
                const duration = Number(playerRef.current?.getDuration?.() || 0)
                if (duration > 0) {
                  const nextPercent = Math.min(100, Math.round((current / duration) * 100))
                  setProgressPercent(nextPercent)
                }
              } catch {
                // ignore
              }
            }, 5000)
          },
        },
      })
    }

    setupPlayer()

    return () => {
      isMounted = false
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
      if (playerRef.current?.destroy) playerRef.current.destroy()
    }
  }, [playerContainerId, videoId])

  const canProceed = progressPercent >= 80 || markedWatched

  const handleComplete = async () => {
    if (!canProceed || isSubmitting) return
    setIsSubmitting(true)

    try {
      const response = await completeTask({
        cycleId,
        dayNumber: Number(dayNumber),
        taskType: 'video',
      })
      if (response?.data?.success) {
        await queryClient.invalidateQueries({ queryKey: ['day', cycleId, Number(dayNumber)] })
        onCompleted?.(response?.data?.nextTask || 'quiz')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="rounded-3xl border border-[var(--bgray)] bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">Task 1: Video + Notes</p>
      <h2 className="mt-1 font-heading text-2xl text-[var(--dark)]">{videoTitle || 'Today video'}</h2>

      <div className="mt-4 flex min-h-[500px] overflow-hidden rounded-2xl border border-[var(--bgray)]">
        <div style={{ width: `${leftWidth}%` }} className="h-full min-h-[500px] bg-[var(--lgray)] p-3">
          <NotesPanel dailyLogId={dailyLogId} mode="panel" />
        </div>

        <button
          ref={dividerRef}
          type="button"
          onMouseDown={() => {
            draggingRef.current = true
          }}
          className="w-2 cursor-col-resize bg-[var(--bgray)]"
          aria-label="Resize notes panel"
        />

        <div style={{ width: `${100 - leftWidth}%` }} className="min-h-[500px] p-3">
          <div className="h-full rounded-xl border border-[var(--bgray)] bg-black">
            <div id={playerContainerId} className="h-[420px] w-full" />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">Progress: {progressPercent}%</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMarkedWatched(true)}
                disabled={markedWatched}
                style={{ opacity: markedWatched ? 0.5 : 1 }}
                className="rounded-xl border border-[var(--bgray)] px-3 py-2 text-sm"
              >
                {markedWatched ? 'Marked as watched' : 'Mark as watched'}
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={!canProceed || isSubmitting}
                style={{ opacity: canProceed ? 1 : 0.4, cursor: canProceed ? 'pointer' : 'default' }}
                className="rounded-xl bg-[var(--cta)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--cta-hover)] disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting...' : 'Next -> Quiz'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default VideoTask
