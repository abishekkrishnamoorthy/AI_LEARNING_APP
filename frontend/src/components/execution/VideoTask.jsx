/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { saveVideoProgress } from '../../api'
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

function VideoTask({
  dailyLogId,
  cycleId,
  dayNumber,
  videoId,
  videoTitle,
  initialVideoProgress,
  onCompleted,
  onAdvance,
}) {
  const [leftWidth, setLeftWidth] = useState(30)
  const [progressPercent, setProgressPercent] = useState(() =>
    Math.round((Number(initialVideoProgress?.percent) || 0) * 100)
  )
  const [showAlmostDone, setShowAlmostDone] = useState((Number(initialVideoProgress?.percent) || 0) >= 0.9)
  const [isBackendCompleted, setIsBackendCompleted] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [completionError, setCompletionError] = useState('')

  const dividerRef = useRef(null)
  const draggingRef = useRef(false)
  const playerRef = useRef(null)
  const progressTimerRef = useRef(null)
  const completionRequestedRef = useRef(false)
  const playerContainerId = useMemo(() => `yt-player-${Math.random().toString(36).slice(2, 9)}`, [])

  const clearProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }
  }, [])

  const triggerBackendCompletion = useCallback(async () => {
    if (completionRequestedRef.current || isBackendCompleted || isCompleting) return
    completionRequestedRef.current = true
    setIsCompleting(true)
    setCompletionError('')

    try {
      const ok = await onCompleted?.()
      if (!ok) {
        completionRequestedRef.current = false
        setCompletionError('Unable to verify completion yet. Keep playing and try again.')
        return
      }
      setIsBackendCompleted(true)
    } catch {
      completionRequestedRef.current = false
      setCompletionError('Unable to verify completion yet. Keep playing and try again.')
    } finally {
      setIsCompleting(false)
    }
  }, [isBackendCompleted, isCompleting, onCompleted])

  const syncProgress = useCallback(async ({ ended = false } = {}) => {
    try {
      const current = Math.max(0, Number(playerRef.current?.getCurrentTime?.() || 0))
      const duration = Math.max(0, Number(playerRef.current?.getDuration?.() || 0))
      const progress = duration > 0 ? Math.min(1, current / duration) : 0

      const nextPercent = Math.min(100, Math.round(progress * 100))
      setProgressPercent(nextPercent)
      setShowAlmostDone(progress >= 0.9)

      await saveVideoProgress({
        cycleId,
        dayNumber: Number(dayNumber),
        taskType: 'video',
        progress,
        currentTime: current,
        duration,
        videoId,
        ended,
      })

      if (ended || progress >= 0.95) {
        await triggerBackendCompletion()
      }
    } catch {
      // ignore tracking errors and keep the player responsive
    }
  }, [cycleId, dayNumber, triggerBackendCompletion, videoId])

  useEffect(() => {
    const initialProgress = Number(initialVideoProgress?.percent) || 0
    if (initialProgress >= 0.95 || Boolean(initialVideoProgress?.ended)) {
      triggerBackendCompletion()
    }
  }, [initialVideoProgress?.ended, initialVideoProgress?.percent, triggerBackendCompletion])

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
          onReady: () => {
            syncProgress()
          },
          onStateChange: async (event) => {
            if (event?.data === 0) {
              setProgressPercent(100)
              setShowAlmostDone(false)
              await syncProgress({ ended: true })
            }

            clearProgressTimer()
            if (event?.data !== 1) return

            progressTimerRef.current = setInterval(() => {
              syncProgress()
            }, 3000)
          },
        },
      })
    }

    setupPlayer()

    return () => {
      isMounted = false
      clearProgressTimer()
      if (playerRef.current?.destroy) playerRef.current.destroy()
    }
  }, [clearProgressTimer, playerContainerId, syncProgress, videoId])

  const handleAdvance = async () => {
    if (!isBackendCompleted || isAdvancing) return
    setIsAdvancing(true)
    try {
      await onAdvance?.()
    } finally {
      setIsAdvancing(false)
    }
  }

  return (
    <section className="rounded-3xl border border-[var(--bgray)] bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">Task 1: Video + Notes</p>
      <h2 className="mt-1 font-heading text-2xl text-[var(--dark)]">{videoTitle || 'Today video'}</h2>

      <div className="mt-4 flex min-h-[500px] overflow-hidden rounded-2xl border border-[var(--bgray)]">
        <div style={{ width: `${leftWidth}%` }} className="h-full min-h-[500px] bg-[var(--lgray)] p-3">
          <NotesPanel cycleId={cycleId} dayNumber={dayNumber} mode="panel" />
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
            <div>
              <p className="text-sm text-slate-600">Progress: {progressPercent}%</p>
              {showAlmostDone && !isBackendCompleted ? (
                <p className="text-xs text-[var(--cta)]">Video almost completed</p>
              ) : null}
              {completionError ? <p className="text-xs text-red-600">{completionError}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              {isCompleting ? <p className="text-xs text-slate-500">Verifying completion...</p> : null}
              {isBackendCompleted ? (
                <button
                  type="button"
                  onClick={handleAdvance}
                  disabled={isAdvancing}
                  className="rounded-xl bg-[var(--cta)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--cta-hover)] disabled:opacity-60"
                >
                  {isAdvancing ? 'Loading quiz...' : 'Next -> Quiz'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default VideoTask
