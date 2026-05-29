import { useCallback, useEffect, useRef, useState } from 'react'

const readDraft = (key) => {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(key) || ''
}

export function useDraftNotes(cycleId, dayNumber) {
  const key = `draft_notes_${cycleId}_${dayNumber}`
  const debounceRef = useRef(null)

  const [content, setContent] = useState(() => readDraft(key))

  const updateContent = useCallback(
    (text) => {
      setContent(text)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        if (typeof window === 'undefined') return
        window.localStorage.setItem(key, text)
      }, 1000)
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

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    []
  )

  return { content, updateContent, clearDraft, getDraft }
}

export default useDraftNotes
