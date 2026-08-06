import { useCallback, useEffect, useState } from 'react'

const readDraft = (key) => {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(key) || ''
}

export function useDraftNotes(cycleId, dayNumber) {
  const key = `draft_notes_${cycleId}_${dayNumber}`

  const [content, setContent] = useState(() => readDraft(key))

  const updateContent = useCallback(
    (text) => {
      setContent(text)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, text)
      }
    },
    [key]
  )

  const clearDraft = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key)
    }
    setContent('')
  }, [key])

  const getDraft = useCallback(() => readDraft(key), [key])

  useEffect(() => {
    setContent(readDraft(key))
  }, [key])

  return { content, updateContent, clearDraft, getDraft }
}

export default useDraftNotes
