/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Editor from '@monaco-editor/react'
import { getChatHistory, streamChatMessage, submitDepth, submitPractical } from '../../api'
import NotesPanel from './NotesPanel'

function DepthTask({
  dailyLogId,
  cycleId,
  dayNumber,
  depthQuestion,
  practicalTask,
  isAIOpen,
  onToggleAI,
  onCompleted,
}) {
  const queryClient = useQueryClient()
  const [depthAnswer, setDepthAnswer] = useState('')
  const [depthResult, setDepthResult] = useState(null)
  const [depthSubmitting, setDepthSubmitting] = useState(false)

  const [language, setLanguage] = useState('javascript')
  const [code, setCode] = useState(practicalTask?.starterCode || '')
  const [writtenAnswer, setWrittenAnswer] = useState('')
  const [practicalSubmitting, setPracticalSubmitting] = useState(false)
  const [practicalDone, setPracticalDone] = useState(false)

  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [showNotes, setShowNotes] = useState(false)

  useEffect(() => {
    setCode(practicalTask?.starterCode || '')
  }, [practicalTask?.starterCode])

  useEffect(() => {
    const loadHistory = async () => {
      if (!isAIOpen || !dailyLogId) return
      const response = await getChatHistory(dailyLogId)
      setMessages(response?.data?.data || [])
    }
    loadHistory()
  }, [dailyLogId, isAIOpen])

  const feedbackTone = useMemo(() => {
    if (!depthResult) return 'border-[var(--bgray)] bg-[var(--lgray)]'
    if (depthResult.flag === 'correct') return 'border-green-300 bg-green-50'
    if (depthResult.flag === 'partial') return 'border-amber-300 bg-amber-50'
    return 'border-red-300 bg-red-50'
  }, [depthResult])

  const handleDepthSubmit = async () => {
    if (depthAnswer.trim().length < 30 || depthSubmitting) return
    setDepthSubmitting(true)
    try {
      const response = await submitDepth({
        dailyLogId,
        cycleId,
        dayNumber: Number(dayNumber),
        answer: depthAnswer,
      })
      if (response?.data?.success) {
        await queryClient.invalidateQueries({ queryKey: ['day', cycleId, Number(dayNumber)] })
      }
      setDepthResult(response?.data?.data)
    } finally {
      setDepthSubmitting(false)
    }
  }

  const handlePracticalSubmit = async () => {
    if (practicalSubmitting) return
    setPracticalSubmitting(true)
    try {
      const response = await submitPractical({
        dailyLogId,
        cycleId,
        dayNumber: Number(dayNumber),
        code,
        language,
        writtenAnswer,
      })
      if (response?.data?.success) {
        await queryClient.invalidateQueries({ queryKey: ['day', cycleId, Number(dayNumber)] })
      }
      setPracticalDone(true)
    } finally {
      setPracticalSubmitting(false)
    }
  }

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return

    const userText = chatInput.trim()
    setChatInput('')
    setChatLoading(true)

    setMessages((prev) => [...prev, { role: 'user', content: userText, timestamp: new Date() }])
    setMessages((prev) => [...prev, { role: 'assistant', content: '', timestamp: new Date(), streaming: true }])

    try {
      await streamChatMessage({
        dailyLogId,
        message: userText,
        onToken: (token) => {
          setMessages((prev) => {
            const next = [...prev]
            const idx = next.length - 1
            if (idx >= 0 && next[idx].role === 'assistant') {
              next[idx] = { ...next[idx], content: `${next[idx].content || ''}${token}`, streaming: true }
            }
            return next
          })
        },
        onDone: () => {
          setMessages((prev) => {
            const next = [...prev]
            const idx = next.length - 1
            if (idx >= 0 && next[idx].role === 'assistant') {
              next[idx] = { ...next[idx], streaming: false }
            }
            return next
          })
        },
      })
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <section className="relative rounded-3xl border border-[var(--bgray)] bg-white p-6 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">Task 3: Depth + Practical + AI Chat</p>
      <div className="mt-2 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowNotes((prev) => !prev)}
          style={{
            padding: '5px 11px',
            background: showNotes ? '#E6E6FA' : '#F5F5F5',
            color: showNotes ? '#7B5EA7' : '#666',
            border: '1px solid #E0E0E0',
            borderRadius: '8px',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          {showNotes ? 'Hide notes' : 'See notes'}
        </button>
      </div>

      <div className="mt-4 space-y-5">
        <article className="rounded-2xl border border-[var(--bgray)] p-4">
          <h2 className="font-heading text-2xl text-[var(--dark)]">Depth Question</h2>
          <p className="mt-2 text-sm text-slate-700">{depthQuestion}</p>

          <textarea
            value={depthAnswer}
            onChange={(event) => setDepthAnswer(event.target.value)}
            className="mt-3 h-32 w-full rounded-xl border border-[var(--bgray)] px-3 py-2 text-sm outline-none focus:border-[var(--blue)]"
            placeholder="Write your explanation..."
          />
          <p className="mt-1 text-xs text-slate-500">{depthAnswer.trim().length} characters (minimum 30)</p>

          <button
            type="button"
            onClick={handleDepthSubmit}
            disabled={depthSubmitting || depthAnswer.trim().length < 30}
            className="mt-3 rounded-xl bg-[var(--cta)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--cta-hover)] disabled:opacity-60"
          >
            {depthSubmitting ? 'Evaluating...' : 'Submit Depth Answer'}
          </button>

          {depthResult ? (
            <div className={`mt-3 rounded-xl border p-3 ${feedbackTone}`}>
              <p className="text-sm font-semibold capitalize text-[var(--dark)]">
                {depthResult.flag} (Depth {depthResult.depth}/5)
              </p>
              <p className="mt-1 text-sm text-slate-700">{depthResult.feedback}</p>
            </div>
          ) : null}
        </article>

        {depthResult ? (
          <article className="rounded-2xl border border-[var(--bgray)] p-4">
            <h3 className="font-heading text-xl text-[var(--dark)]">Practical Task</h3>
            <p className="mt-2 text-sm text-slate-700">{practicalTask?.prompt}</p>

            {practicalTask?.type === 'code' ? (
              <>
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="mt-3 rounded-xl border border-[var(--bgray)] px-3 py-2 text-sm"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="typescript">TypeScript</option>
                </select>
                <div className="mt-3 overflow-hidden rounded-xl border border-[var(--bgray)]">
                  <Editor
                    height="320px"
                    language={language}
                    value={code}
                    onChange={(nextValue) => setCode(nextValue || '')}
                    options={{ minimap: { enabled: false }, fontSize: 14 }}
                  />
                </div>
              </>
            ) : (
              <textarea
                value={writtenAnswer}
                onChange={(event) => setWrittenAnswer(event.target.value)}
                className="mt-3 h-32 w-full rounded-xl border border-[var(--bgray)] px-3 py-2 text-sm outline-none focus:border-[var(--blue)]"
                placeholder="Write your practical response..."
              />
            )}

            <button
              type="button"
              onClick={handlePracticalSubmit}
              disabled={practicalSubmitting}
              className="mt-3 rounded-xl bg-[var(--cta)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--cta-hover)] disabled:opacity-60"
            >
              {practicalSubmitting ? 'Submitting...' : 'Submit Practical Task'}
            </button>

            {practicalDone ? (
              <div className="mt-3 rounded-xl border border-green-300 bg-green-50 p-3">
                <p className="text-sm font-semibold text-green-700">Practical task submitted successfully.</p>
                <button
                  type="button"
                  onClick={() => onCompleted('summary')}
                  className="mt-2 rounded-xl bg-[var(--cta)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--cta-hover)]"
                >
                  Go to Summary
                </button>
              </div>
            ) : null}
          </article>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onToggleAI}
        className="fixed bottom-6 right-6 z-30 rounded-full bg-[var(--cta)] px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[var(--cta-hover)]"
      >
        Ask AI
      </button>

      {isAIOpen ? (
        <div className="fixed inset-y-0 right-0 z-40 w-full max-w-xl border-l border-[var(--bgray)] bg-white p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <h4 className="font-heading text-xl text-[var(--dark)]">AI Assistant</h4>
            <button
              type="button"
              onClick={onToggleAI}
              className="rounded-lg border border-[var(--bgray)] px-2 py-1 text-xs"
            >
              Close
            </button>
          </div>

          <div className="mt-4 h-[70vh] space-y-2 overflow-y-auto rounded-xl border border-[var(--bgray)] bg-[var(--lgray)] p-3">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-500">Ask a question about today's subtopic.</p>
            ) : (
              messages.map((item, idx) => (
                <article
                  key={`${item.role}-${idx}`}
                  className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${item.role === 'user' ? 'ml-auto bg-[var(--cta)] text-white' : 'bg-white text-[var(--dark)]'}`}
                >
                  {item.content}
                </article>
              ))
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleSendChat()
                }
              }}
              className="flex-1 rounded-xl border border-[var(--bgray)] px-3 py-2 text-sm"
              placeholder="Ask about today's subtopic..."
            />
            <button
              type="button"
              onClick={handleSendChat}
              disabled={chatLoading}
              className="rounded-xl bg-[var(--cta)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--cta-hover)] disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </div>
      ) : null}

      {showNotes ? <NotesPanel cycleId={cycleId} dayNumber={dayNumber} mode="drawer" /> : null}
    </section>
  )
}

export default DepthTask
