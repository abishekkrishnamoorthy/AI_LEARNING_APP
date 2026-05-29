/* eslint-disable react/prop-types */
const typeLabel = {
  video: 'Task 1',
  quiz: 'Task 2',
  depth: 'Task 3',
  practical: 'Task 3',
  summary: 'Summary',
}

const dayTypeLabel = {
  odd: 'Odd Day',
  even: 'Even Day',
  assessment: 'Assessment Day',
  beginner_all_tasks: 'Beginner Focus Day',
}

function TaskTopBar({
  topicId,
  cycleId,
  dayNumber,
  dayType,
  tasks,
  onBack,
  onToggleAI,
  onToggleFullscreen,
  isFullscreen,
}) {
  const depthTask = tasks.find((task) => task.type === 'depth')
  const practicalTask = tasks.find((task) => task.type === 'practical')

  const task3Status = practicalTask?.status || depthTask?.status || null
  const displayTasks = [
    tasks.find((task) => task.type === 'video'),
    tasks.find((task) => task.type === 'quiz'),
    task3Status ? { type: 'depth', status: task3Status } : null,
    tasks.find((task) => task.type === 'summary'),
  ].filter(Boolean)

  return (
    <header className="rounded-3xl border border-[var(--bgray)] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-[var(--bgray)] px-3 py-1 text-sm font-medium text-[var(--dark)]"
          >
            Back
          </button>
          <p className="mt-2 text-sm text-slate-600">
            Topic {topicId.slice(0, 6)}... / Cycle {cycleId.slice(0, 6)}... / Day {dayNumber}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[var(--lpurple)] px-3 py-1 text-xs font-semibold text-[var(--dark)]">
            {dayTypeLabel[dayType] || 'Learning Day'}
          </span>
          <button
            type="button"
            onClick={onToggleAI}
            className="rounded-xl border border-[var(--bgray)] px-3 py-2 text-sm text-[var(--dark)]"
          >
            AI
          </button>
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="rounded-xl bg-[var(--cta)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--cta-hover)]"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {displayTasks.map((task, index) => {
          const tone =
            task.status === 'done'
              ? 'bg-green-100 text-green-700 border-green-300'
              : task.status === 'active'
                ? 'bg-[var(--lpurple)] text-[var(--dark)] border-[var(--palm)]'
                : 'bg-[var(--lgray)] text-slate-500 border-[var(--bgray)]'

          return (
            <span
              key={`${task.type}-${index}`}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}
            >
              {typeLabel[task.type] || task.type}
            </span>
          )
        })}
      </div>
    </header>
  )
}

export default TaskTopBar
