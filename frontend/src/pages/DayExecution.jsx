import { useEffect, useMemo, useState } from 'react'
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

function DayExecution() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { topicId, cycleId, dayNumber } = useParams()

  const [aiOpen, setAiOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement))
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

  const normalizedTasks = useMemo(() => dayData?.tasks || [], [dayData?.tasks])
  const activeTask =
    normalizedTasks.find((task) => task.status === 'active') ||
    normalizedTasks.find((task) => task.status !== 'done')
  const currentTaskType = activeTask?.type || 'summary'
  const renderTaskType = ['practical', 'depth_question'].includes(currentTaskType) ? 'depth' : currentTaskType

  const handleTaskComplete = async (taskType) => {
    const response = await completeTask({
      cycleId,
      dayNumber: Number(dayNumber),
      taskType,
    })

    return Boolean(response?.data?.success)
  }

  const refreshDay = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['day', cycleId, Number(dayNumber)],
    })
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
          onBack={() => navigate('/home')}
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
            onAdvance={refreshDay}
          />
        ) : null}

        {renderTaskType === 'quiz' ? (
          <QuizTask
            cycleId={cycleId}
            dayNumber={parsedDayNumber}
            questions={dayData.questions || []}
            onCompleted={() => {}}
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
            onCompleted={() => {}}
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
      </div>
    </main>
  )
}

export default DayExecution
