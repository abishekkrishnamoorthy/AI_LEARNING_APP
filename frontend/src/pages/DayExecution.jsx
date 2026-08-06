import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { completeTask, getDayExecution } from '../api'
import DepthTask from '../components/execution/DepthTask'
import QuizTask from '../components/execution/QuizTask'
import SummaryPage from '../components/execution/SummaryPage'
import TaskTopBar from '../components/execution/TaskTopBar'
import VideoTask from '../components/execution/VideoTask'

const fetchDay = async (cycleId, dayNumber) => {
  const response = await getDayExecution(cycleId, dayNumber)
  return response?.data?.data
}

const normalizeTaskType = (type = '') => (type === 'depth_question' ? 'depth' : type)
const taskOrder = ['video', 'quiz', 'depth', 'summary']

const toRenderTaskType = (type = '') => {
  const normalized = normalizeTaskType(type)
  return ['practical', 'depth_question'].includes(normalized) ? 'depth' : normalized
}

const getPrimaryTaskType = (tasks = []) => {
  const activeTask = tasks.find((task) => task.status === 'active') || tasks.find((task) => task.status !== 'done')
  return toRenderTaskType(activeTask?.type || 'summary')
}

function DayExecution() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { topicId, cycleId, dayNumber } = useParams()

  const progressSaverRef = useRef(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement))
  const [pendingAdvanceTasks, setPendingAdvanceTasks] = useState(null)
  const [viewTaskType, setViewTaskType] = useState(null)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [quizState, setQuizState] = useState({ index: 0, answersMap: {} })
  const parsedDayNumber = Number(dayNumber)

  const {
    data: dayData,
    isLoading: loading,
  } = useQuery({
    queryKey: ['day', cycleId, parsedDayNumber],
    queryFn: () => fetchDay(cycleId, parsedDayNumber),
    enabled: Boolean(cycleId && Number.isFinite(parsedDayNumber)),
  })

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  useEffect(() => {
    setPendingAdvanceTasks(null)
    setViewTaskType(null)
    setQuizState({ index: 0, answersMap: {} })
  }, [cycleId, parsedDayNumber])

  const normalizedTasks = useMemo(() => dayData?.tasks || [], [dayData?.tasks])
  const backendTaskType = useMemo(() => getPrimaryTaskType(normalizedTasks), [normalizedTasks])
  const unlockedTaskTypes = useMemo(
    () =>
      normalizedTasks
        .filter((task) => ['active', 'done'].includes(task.status))
        .map((task) => toRenderTaskType(task.type)),
    [normalizedTasks]
  )
  const renderTaskType = viewTaskType || backendTaskType
  const viewedTask = normalizedTasks.find((task) => toRenderTaskType(task.type) === renderTaskType)
  const currentTaskNumber =
    renderTaskType === 'video' ? 1 : renderTaskType === 'quiz' ? 2 : renderTaskType === 'depth' ? 3 : null
  const topNextDisabledReason = currentTaskNumber ? `Need to finish Task ${currentTaskNumber} first` : ''
  const previousUnlockedTaskType = useMemo(() => {
    if (renderTaskType === 'summary') return null
    const currentIndex = taskOrder.indexOf(renderTaskType)
    if (currentIndex <= 0) return null

    for (let index = currentIndex - 1; index >= 0; index -= 1) {
      if (unlockedTaskTypes.includes(taskOrder[index])) {
        return taskOrder[index]
      }
    }
    return null
  }, [renderTaskType, unlockedTaskTypes])
  const nextUnlockedTaskType = useMemo(() => {
    if (renderTaskType === 'summary') return null
    const currentIndex = taskOrder.indexOf(renderTaskType)
    if (currentIndex === -1) return null

    for (let index = currentIndex + 1; index < taskOrder.length; index += 1) {
      if (unlockedTaskTypes.includes(taskOrder[index])) {
        return taskOrder[index]
      }
    }
    return null
  }, [renderTaskType, unlockedTaskTypes])
  const showSessionBack = Boolean(previousUnlockedTaskType && renderTaskType !== 'summary')
  const topNextUnlocked = Boolean(pendingAdvanceTasks?.length || (viewedTask?.status === 'done' && nextUnlockedTaskType))

  useEffect(() => {
    setViewTaskType((current) => {
      if (backendTaskType === 'summary') return 'summary'
      if (current && unlockedTaskTypes.includes(current)) return current
      return backendTaskType
    })
  }, [backendTaskType, unlockedTaskTypes])

  useEffect(() => {
    if (renderTaskType !== 'summary') return undefined

    window.history.pushState({ learningSummary: true }, '', window.location.href)
    const handlePopState = () => {
      window.history.pushState({ learningSummary: true }, '', window.location.href)
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [renderTaskType])

  const applyTaskUpdate = (tasks) => {
    if (!Array.isArray(tasks)) return
    const queryKey = ['day', cycleId, parsedDayNumber]
    queryClient.setQueryData(queryKey, (prev) => {
      if (!prev) return prev
      return {
        ...prev,
        tasks: tasks.map((task) => ({
          type: normalizeTaskType(task.type),
          status: task.status,
        })),
      }
    })
  }

  const handleTaskComplete = async (taskType, { applyImmediately = false } = {}) => {
    const response = await completeTask({
      cycleId,
      dayNumber: Number(dayNumber),
      taskType,
    })
    const nextTasks = response?.data?.tasks
    if (applyImmediately) {
      applyTaskUpdate(nextTasks)
      queryClient.invalidateQueries({
        queryKey: ['day', cycleId, Number(dayNumber)],
      })
    } else if (Array.isArray(nextTasks)) {
      setPendingAdvanceTasks(nextTasks)
    }

    return Boolean(response?.data?.success)
  }

  const refreshDay = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['day', cycleId, Number(dayNumber)],
    })
  }

  const handleTopNext = async () => {
    if (pendingAdvanceTasks?.length) {
      const nextTaskType = getPrimaryTaskType(pendingAdvanceTasks)
      applyTaskUpdate(pendingAdvanceTasks)
      setPendingAdvanceTasks(null)
      setViewTaskType(nextTaskType)
      await refreshDay()
    } else if (nextUnlockedTaskType) {
      setViewTaskType(nextUnlockedTaskType)
    }
  }

  const handleSessionBack = () => {
    if (!previousUnlockedTaskType) return
    setViewTaskType(previousUnlockedTaskType)
  }

  const handleExitLearning = async () => {
    if (isExiting) return
    setIsExiting(true)
    try {
      await progressSaverRef.current?.()
      navigate('/home')
    } finally {
      setIsExiting(false)
    }
  }

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }
    await document.documentElement.requestFullscreen()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--bg)] p-5">
        <div className="mx-auto max-w-7xl animate-pulse rounded-3xl border border-[var(--bgray)] bg-white p-8">
          <div className="h-8 w-80 rounded bg-[var(--lgray)]" />
          <div className="mt-3 h-4 w-52 rounded bg-[var(--lgray)]" />
          <div className="mt-6 h-72 rounded-xl bg-[var(--lgray)]" />
        </div>
      </main>
    )
  }

  if (!dayData) {
    return (
      <main className="min-h-screen bg-[var(--bg)] p-5">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--bgray)] bg-white p-6 shadow-sm">
          <p className="text-sm text-red-600">Unable to load this day.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <TaskTopBar
          topicId={topicId}
          cycleId={cycleId}
          dayNumber={Number(dayNumber)}
          dayType={dayData.dayType}
          tasks={normalizedTasks}
          onBack={handleSessionBack}
          showBack={showSessionBack}
          nextLabel="Next"
          canGoNext={topNextUnlocked}
          nextDisabledReason={topNextDisabledReason}
          onNext={handleTopNext}
          onExitLearning={() => setExitConfirmOpen(true)}
          onToggleAI={() => setAiOpen((prev) => !prev)}
          onToggleFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
        />

        {renderTaskType === 'video' ? (
          <VideoTask
            dailyLogId={dayData.dailyLogId}
            cycleId={cycleId}
            dayNumber={parsedDayNumber}
            videoId={dayData.videoId}
            videoTitle={dayData.videoTitle}
            initialVideoProgress={dayData.videoProgress}
            onCompleted={() => handleTaskComplete('video')}
            onAdvance={handleTopNext}
            onRegisterProgressSaver={(saver) => {
              progressSaverRef.current = saver
            }}
          />
        ) : null}

        {renderTaskType === 'quiz' ? (
          <QuizTask
            cycleId={cycleId}
            dayNumber={parsedDayNumber}
            questions={dayData.questions || []}
            quizState={quizState}
            onQuizStateChange={setQuizState}
            onCompleted={(nextTask) => setViewTaskType(toRenderTaskType(nextTask || 'summary'))}
          />
        ) : null}

        {renderTaskType === 'depth' ? (
          <DepthTask
            dailyLogId={dayData.dailyLogId}
            cycleId={cycleId}
            dayNumber={parsedDayNumber}
            depthQuestion={dayData.depthQuestion}
            practicalTask={dayData.practicalTask}
            isAIOpen={aiOpen}
            onToggleAI={() => setAiOpen((prev) => !prev)}
            onCompleted={(nextTask) => setViewTaskType(toRenderTaskType(nextTask || 'summary'))}
          />
        ) : null}

        {renderTaskType === 'summary' ? (
          <SummaryPage
            dailyLogId={dayData.dailyLogId}
            topicId={topicId}
            cycleId={cycleId}
            dayNumber={parsedDayNumber}
            subtopic={dayData.subtopic}
            onStartNextDay={() => navigate(`/topic/${topicId}/cycle/${cycleId}/day/${parsedDayNumber + 1}`)}
            onViewCycleReport={() => navigate('/home')}
          />
        ) : null}

        {exitConfirmOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
            role="presentation"
            onClick={() => setExitConfirmOpen(false)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="exit-learning-title"
              className="w-full max-w-md rounded-2xl border border-[var(--bgray)] bg-white p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="exit-learning-title" className="font-heading text-2xl text-[var(--dark)]">
                Exit Learning Session?
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Your progress has been saved.
                <br />
                You can continue this learning session later.
              </p>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExitConfirmOpen(false)}
                  className="rounded-xl border border-[var(--bgray)] px-4 py-2 text-sm font-semibold text-[var(--dark)]"
                >
                  Continue Learning
                </button>
                <button
                  type="button"
                  onClick={handleExitLearning}
                  disabled={isExiting}
                  className="rounded-xl bg-[var(--cta)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--cta-hover)] disabled:opacity-60"
                >
                  {isExiting ? 'Saving...' : 'Exit to Home'}
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  )
}

export default DayExecution
