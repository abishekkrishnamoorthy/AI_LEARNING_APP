/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { submitQuiz } from '../../api'
import NotesPanel from './NotesPanel'

function QuizTask({ dailyLogId, cycleId, dayNumber, questions = [], notesOpen, onToggleNotes, onCompleted }) {
  const queryClient = useQueryClient()
  const [index, setIndex] = useState(0)
  const [answersMap, setAnswersMap] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const current = questions[index]

  const answerPayload = useMemo(
    () =>
      Object.entries(answersMap).map(([questionId, selected]) => ({
        questionId,
        selected,
      })),
    [answersMap]
  )

  const handleSelect = (selected) => {
    if (!current) return
    const questionId = String(current._id || index)
    setAnswersMap((prev) => ({ ...prev, [questionId]: selected }))
  }

  const handleNext = () => {
    if (index < questions.length - 1) {
      setIndex((prev) => prev + 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await submitQuiz({
        cycleId,
        dayNumber: Number(dayNumber),
        answers: answerPayload,
      })
      if (response?.data?.success) {
        await queryClient.invalidateQueries({ queryKey: ['day', cycleId, Number(dayNumber)] })
      }
      setResult(response?.data?.data)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (result) {
    return (
      <section className="rounded-3xl border border-[var(--bgray)] bg-white p-6 shadow-sm">
        <h2 className="font-heading text-2xl text-[var(--dark)]">Quiz Results</h2>
        <p className="mt-2 text-sm text-slate-600">
          Score: {result.score}/{result.total}
        </p>

        <div className="mt-4 space-y-2">
          {result.perQuestion?.map((item, idx) => (
            <article
              key={`result-${idx}`}
              className={`rounded-xl border p-3 ${item.correct ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}
            >
              <p className="text-sm font-semibold text-[var(--dark)]">
                Q{idx + 1}: {item.correct ? 'Correct' : 'Incorrect'}
              </p>
              <p className="mt-1 text-sm text-slate-700">{item.explanation}</p>
            </article>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onCompleted(result.nextTask || 'summary')}
          className="mt-4 rounded-xl bg-[var(--cta)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--cta-hover)]"
        >
          Next
        </button>
      </section>
    )
  }

  return (
    <section className="rounded-3xl border border-[var(--bgray)] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Task 2: Quiz</p>
          <h2 className="mt-1 font-heading text-2xl text-[var(--dark)]">Question {index + 1} of {questions.length}</h2>
        </div>
        <button
          type="button"
          onClick={onToggleNotes}
          className="rounded-xl border border-[var(--bgray)] px-3 py-2 text-sm"
        >
          Notes
        </button>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--lgray)]">
        <div
          className="h-full bg-[var(--cta)]"
          style={{ width: `${((index + 1) / Math.max(1, questions.length)) * 100}%` }}
        />
      </div>

      <article className="mt-4 rounded-2xl border border-[var(--bgray)] p-4">
        <p className="text-base font-semibold text-[var(--dark)]">{current?.question}</p>
        <div className="mt-4 grid grid-cols-1 gap-2">
          {(current?.options || []).map((option) => {
            const questionId = String(current?._id || index)
            const selected = answersMap[questionId] === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className={`rounded-xl border px-3 py-3 text-left text-sm ${selected ? 'border-[var(--cta)] bg-[var(--lpurple)]' : 'border-[var(--bgray)]'}`}
              >
                {option}
              </button>
            )
          })}
        </div>
      </article>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button type="button" disabled className="rounded-xl border border-[var(--bgray)] px-3 py-2 text-sm opacity-60">
          Previous Disabled
        </button>

        {index < questions.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className="rounded-xl bg-[var(--cta)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--cta-hover)]"
          >
            Next Question
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || answerPayload.length < questions.length}
            className="rounded-xl bg-[var(--cta)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--cta-hover)] disabled:opacity-60"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        )}
      </div>

      <NotesPanel dailyLogId={dailyLogId} mode="drawer" isOpen={notesOpen} onClose={onToggleNotes} />
    </section>
  )
}

export default QuizTask
