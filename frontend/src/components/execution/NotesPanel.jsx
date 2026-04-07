/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from 'react'
import { getNotes, saveNotes } from '../../api'

function NotesPanel({ dailyLogId, mode = 'panel', isOpen = true, onClose }) {
  const [content, setContent] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)
  const [saveState, setSaveState] = useState('idle')
  const timerRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      if (!dailyLogId) return
      try {
        const response = await getNotes(dailyLogId)
        setContent(response?.data?.data?.content || '')
      } catch {
        setContent('')
      }
    }
    load()
  }, [dailyLogId])

  const persist = async (nextContent) => {
    if (!dailyLogId) return
    try {
      setSaveState('saving')
      await saveNotes(dailyLogId, nextContent)
      setUpdatedAt(new Date())
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  const scheduleSave = (nextValue) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      persist(nextValue)
    }, 30000)
  }

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    []
  )

  const blocks = useMemo(() => {
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .reverse()
      .slice(0, 12)
  }, [content])

  const panel = (
    <section className="h-full rounded-3xl border border-[var(--bgray)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-heading text-xl text-[var(--dark)]">Notes</h3>
        {mode === 'drawer' ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--bgray)] px-2 py-1 text-xs"
          >
            Close
          </button>
        ) : null}
      </div>

      <textarea
        value={content}
        onChange={(event) => {
          const nextValue = event.target.value
          setContent(nextValue)
          scheduleSave(nextValue)
        }}
        onBlur={() => persist(content)}
        placeholder="Write concise notes while learning..."
        className="h-40 w-full rounded-xl border border-[var(--bgray)] px-3 py-2 text-sm outline-none focus:border-[var(--blue)]"
      />

      <p className="mt-2 text-xs text-slate-500">
        {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Save failed' : 'Auto-save every 30s'}
        {updatedAt ? ` • ${updatedAt.toLocaleTimeString()}` : ''}
      </p>

      <div className="mt-4 space-y-2">
        {blocks.length === 0 ? (
          <p className="text-sm text-slate-500">No saved notes yet.</p>
        ) : (
          blocks.map((block, idx) => (
            <article key={`${block}-${idx}`} className="rounded-xl border border-[var(--bgray)] bg-[var(--lgray)] p-3">
              <p className="text-sm text-[var(--dark)]">{block}</p>
            </article>
          ))
        )}
      </div>
    </section>
  )

  if (mode !== 'drawer') return panel
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 flex">
      <button type="button" className="flex-1 bg-black/25" onClick={onClose} aria-label="Close notes drawer" />
      <div className="h-full w-full max-w-md bg-white p-4 shadow-2xl">{panel}</div>
    </div>
  )
}

export default NotesPanel
