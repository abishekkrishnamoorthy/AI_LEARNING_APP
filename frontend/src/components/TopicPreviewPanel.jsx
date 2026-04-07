/* eslint-disable react/prop-types */
function TopicPreviewPanel({ topics = [] }) {
  return (
    <aside className="space-y-4 lg:w-80">
      <section className="rounded-3xl border border-[var(--bgray)] bg-white p-5 shadow-sm">
        <h3 className="font-heading text-xl text-[var(--dark)]">Your Topics</h3>
        <div className="mt-4 space-y-3">
          {topics.length === 0 ? (
            <p className="text-sm text-slate-500">No topics yet.</p>
          ) : (
            topics.slice(0, 5).map((topic) => (
              <article key={topic._id} className="rounded-xl border border-[var(--bgray)] p-3">
                <p className="text-sm font-semibold text-[var(--dark)]">{topic.name}</p>
                <p className="mt-1 text-xs uppercase text-slate-500">{topic.status}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-[var(--lpurple)] p-5">
        <h4 className="font-heading text-lg text-[var(--dark)]">Tip</h4>
        <p className="mt-2 text-sm text-slate-700">
          A detailed description helps AI prioritize better subtopics and assessment focus.
        </p>
      </section>
    </aside>
  )
}

export default TopicPreviewPanel
