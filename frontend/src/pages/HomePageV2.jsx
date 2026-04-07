import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import HomeLayout from '../components/layout/HomeLayout'
import { getTopics } from '../api'

function HomePageV2() {
  const { data: topicsResponse, isLoading: isTopicsLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: getTopics,
  })

  const topics = useMemo(() => topicsResponse?.data?.data || [], [topicsResponse])
  const activeOrPendingTopics = useMemo(
    () => topics.filter((topic) => ['pending', 'generating', 'active'].includes(topic.status)),
    [topics]
  )
  const completedTopics = useMemo(
    () => topics.filter((topic) => topic.status === 'completed'),
    [topics]
  )

  return (
    <HomeLayout title="Home" subtitle="Your dashboard workspace for learning progress and topics.">
      <div className="space-y-6">
        <section className="rounded-3xl border border-[var(--bgray)] bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Dashboard Overview</p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <article className="rounded-xl border border-[var(--bgray)] bg-[var(--lgray)] p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total Topics</p>
              <p className="mt-1 font-heading text-2xl text-[var(--dark)]">{topics.length}</p>
            </article>
            <article className="rounded-xl border border-[var(--bgray)] bg-[var(--lgray)] p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">In Progress</p>
              <p className="mt-1 font-heading text-2xl text-[var(--dark)]">{activeOrPendingTopics.length}</p>
            </article>
            <article className="rounded-xl border border-[var(--bgray)] bg-[var(--lgray)] p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
              <p className="mt-1 font-heading text-2xl text-[var(--dark)]">{completedTopics.length}</p>
            </article>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--bgray)] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-2xl text-[var(--dark)]">All Topics</h2>
              <p className="mt-1 text-sm text-slate-600">Your full topic list and current status.</p>
            </div>
            <Link
              to="/topics/create"
              className="rounded-xl bg-[var(--cta)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--cta-hover)]"
            >
              Create Topic
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {isTopicsLoading ? <p className="text-sm text-slate-500">Loading topics...</p> : null}

            {!isTopicsLoading && topics.length === 0 ? (
              <div className="rounded-xl border border-[var(--bgray)] bg-[var(--lgray)] p-4">
                <p className="text-sm font-semibold text-[var(--dark)]">No topics yet.</p>
                <p className="mt-1 text-sm text-slate-600">Create your first topic to generate a study plan.</p>
              </div>
            ) : null}

            {topics.map((topic) => (
              <article
                key={topic._id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--bgray)] p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--dark)]">{topic.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{topic.description || 'No description provided'}</p>
                </div>
                <p className="rounded-full bg-[var(--lpurple)] px-3 py-1 text-xs font-semibold uppercase text-[var(--dark)]">
                  {topic.status}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--bgray)] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-2xl text-[var(--dark)]">Continue Learning</h2>
              <p className="mt-1 text-sm text-slate-600">Resume your current study flow quickly.</p>
            </div>
            <Link
              to="/continue"
              className="rounded-xl border border-[var(--bgray)] px-4 py-2 text-sm font-medium text-[var(--dark)]"
            >
              Open Continue Learning
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--bgray)] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-2xl text-[var(--dark)]">Documents</h2>
              <p className="mt-1 text-sm text-slate-600">Access notes, references, and reusable templates.</p>
            </div>
            <Link
              to="/documents"
              className="rounded-xl border border-[var(--bgray)] px-4 py-2 text-sm font-medium text-[var(--dark)]"
            >
              Open Documents
            </Link>
          </div>
        </section>
      </div>
    </HomeLayout>
  )
}

export default HomePageV2
