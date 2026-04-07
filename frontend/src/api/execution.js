import httpClient from '../services/httpClient'
import { getAuthToken } from '../utils/authStorage'

export const getDayExecution = (cycleId, dayNumber) => httpClient.get(`/api/day/${cycleId}/${dayNumber}`)

export const completeTask = (payload) => httpClient.post('/api/task/complete', payload)

export const submitQuiz = (payload) => httpClient.post('/api/task/quiz/submit', payload)

export const submitDepth = (payload) => httpClient.post('/api/task/depth/submit', payload)

export const submitPractical = (payload) => httpClient.post('/api/task/practical/submit', payload)

export const getNotes = (dailyLogId) => httpClient.get(`/api/notes/${dailyLogId}`)

export const saveNotes = (dailyLogId, content) => httpClient.put(`/api/notes/${dailyLogId}`, { content })

export const getChatHistory = (dailyLogId) => httpClient.get(`/api/chat/history/${dailyLogId}`)

export const generateSummary = (dailyLogId) => httpClient.post('/api/summary/generate', { dailyLogId })

export const getSummary = (dailyLogId) => httpClient.get(`/api/summary/${dailyLogId}`)

export const streamChatMessage = async ({ dailyLogId, message, onToken, onDone, onError }) => {
  const token = getAuthToken()
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

  const response = await fetch(`${baseURL}/api/chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ dailyLogId, message }),
  })

  if (!response.ok || !response.body) {
    throw new Error('Failed to connect to AI chat')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''

    for (const event of events) {
      const line = event
        .split('\n')
        .find((entry) => entry.startsWith('data:'))

      if (!line) continue
      const payload = line.replace(/^data:\s*/, '').trim()

      if (payload === '[DONE]') {
        onDone?.()
        return
      }

      try {
        const parsed = JSON.parse(payload)
        if (parsed.text) {
          onToken?.(parsed.text)
        }
        if (parsed.error) {
          onError?.(parsed.error)
        }
      } catch {
        // Ignore malformed chunk
      }
    }
  }

  onDone?.()
}
