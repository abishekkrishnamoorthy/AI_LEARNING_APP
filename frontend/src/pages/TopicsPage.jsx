import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import AddSlotCard from '../components/topics/AddSlotCard'
import FilterTabs from '../components/topics/FilterTabs'
import TopicCard from '../components/topics/TopicCard'
import HomeLayout from '../components/layout/HomeLayout'
import { getTopicStatus, getTopics, retryTopic } from '../api'

function TopicsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('all')
  const [toast, setToast] = useState({ show: false, msg: '' })

  const { data: topicsResponse, isLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: getTopics,
  })

  const retryMutation = useMutation({
    mutationFn: retryTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] })
    },
  })

  const topics = useMemo(() => topicsResponse?.data?.data || [], [topicsResponse])
  const activeTopics = useMemo(() => topics.filter((topic) => topic.status === 'active'), [topics])
  const completedTopics = useMemo(() => topics.filter((topic) => topic.status === 'completed'), [topics])
  const pendingTopics = useMemo(
    () => topics.filter((topic) => ['pending', 'generating', 'failed'].includes(topic.status)),
    [topics]
  )

  const counts = useMemo(
    () => ({
      all: topics.length,
      active: activeTopics.length,
      completed: completedTopics.length,
      pending: pendingTopics.length,
    }),
    [topics.length, activeTopics.length, completedTopics.length, pendingTopics.length]
  )

  useEffect(() => {
    const toPoll = pendingTopics.filter((topic) => ['pending', 'generating'].includes(topic.status))
    if (toPoll.length === 0) return undefined

    const timer = setInterval(async () => {
      try {
        const responses = await Promise.all(
          toPoll.map(async (topic) => {
            const response = await getTopicStatus(topic._id)
            return { id: topic._id, oldStatus: topic.status, newStatus: response?.data?.data?.status }
          })
        )

        const changed = responses.some(
          (item) => item.newStatus && item.newStatus !== item.oldStatus && ['active', 'failed', 'completed'].includes(item.newStatus)
        )

        if (changed) {
          queryClient.invalidateQueries({ queryKey: ['topics'] })
        }
      } catch {
        // polling retries automatically on next interval
      }
    }, 3000)

    return () => clearInterval(timer)
  }, [pendingTopics, queryClient])

  const remainingSlots = Math.max(0, 3 - activeTopics.length)

  const sections = useMemo(() => {
    if (activeTab === 'active') {
      return [{ id: 'active', label: `Active — ${activeTopics.length} topics`, topics: activeTopics }]
    }
    if (activeTab === 'completed') {
      return [{ id: 'completed', label: `Completed — ${completedTopics.length} topics`, topics: completedTopics }]
    }
    if (activeTab === 'pending') {
      return [{ id: 'pending', label: `Pending — ${pendingTopics.length} topics`, topics: pendingTopics }]
    }
    return [
      { id: 'active', label: `Active — ${activeTopics.length} topics`, topics: activeTopics },
      { id: 'completed', label: `Completed — ${completedTopics.length} topics`, topics: completedTopics },
      { id: 'pending', label: `Pending — ${pendingTopics.length} topics`, topics: pendingTopics },
    ]
  }, [activeTab, activeTopics, completedTopics, pendingTopics])

  const renderSkeletons = () => (
    <div className="topics-grid">
      {Array.from({ length: 5 }).map((_, index) => (
        <article key={index} className="topic-card topic-card-skeleton">
          <div className="topic-skeleton-banner" />
          <div className="topic-card-body">
            <span className="topic-skeleton-line short" />
            <span className="topic-skeleton-line medium" />
            <span className="topic-skeleton-line long" />
          </div>
        </article>
      ))}
    </div>
  )

  function showToast(topicId, topicName) {
    setToast({ show: true, msg: `"${topicName}" deleted. 1 slot freed.` })
    setTimeout(() => setToast({ show: false, msg: '' }), 3000)
  }

  return (
    <HomeLayout
      title="My topics"
      subtitle=""
      showCreateTopicButton={false}
      topbarExtras={
        <>
          <span className="topics-streak-pill">7 day streak</span>
          <button type="button" className="topics-new-btn" onClick={() => navigate('/topics/create')}>
            + New topic
          </button>
        </>
      }
    >
      <div className="topics-page">
        <div className="topics-hero">
          <h2 className="topics-title">
            Your learning <em>journey</em>
          </h2>
          <div className="topics-stat-row">
            <span className="topics-stat-chip">{counts.all} total</span>
            <span className="topics-stat-chip active">{counts.active} active</span>
            <span className="topics-stat-chip completed">{counts.completed} completed</span>
            <span className="topics-stat-chip pending">{counts.pending} pending</span>
          </div>
        </div>

        {toast.show && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              background: '#fff',
              border: '1px solid #E0E0E0',
              borderLeft: '3px solid #e05a5a',
              borderRadius: '10px',
              fontSize: '12px',
              color: '#1A1A1A',
              marginBottom: '14px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#e05a5a',
                flexShrink: 0,
              }}
            />
            {toast.msg}
          </div>
        )}

        <FilterTabs activeTab={activeTab} counts={counts} onChange={setActiveTab} />

        {isLoading ? (
          renderSkeletons()
        ) : (
          <div className="topics-sections">
            {sections.map((section) => (
              <section key={section.id} className="topic-section">
                <p className="topic-section-label">{section.label}</p>
                {section.topics.length === 0 && !(section.id === 'active' && remainingSlots > 0) ? (
                  <div className="topic-empty">No topics in this section yet.</div>
                ) : (
                  <div className="topics-grid">
                    {section.topics.map((topic) => (
                      <TopicCard
                        key={topic._id}
                        topic={topic}
                        onRetry={(id) => retryMutation.mutate(id)}
                        onDelete={showToast}
                      />
                    ))}
                    {section.id === 'active' && remainingSlots > 0
                      ? Array.from({ length: remainingSlots }).map((_, index) => (
                          <AddSlotCard key={`slot-${index}`} remaining={remainingSlots - index} />
                        ))
                      : null}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </HomeLayout>
  )
}

export default TopicsPage
