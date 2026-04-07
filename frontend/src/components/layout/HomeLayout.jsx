/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../Sidebar'
import { getTopics } from '../../api'

function HomeLayout({ title, subtitle, children, showCreateTopicButton = true, topbarExtras = null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const { data: topicsResponse } = useQuery({
    queryKey: ['topics'],
    queryFn: getTopics,
  })

  const topicCount = useMemo(() => topicsResponse?.data?.data?.length || 0, [topicsResponse])

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="lf-layout-shell">
      <div className="lf-sidebar-wrap desktop">
        <Sidebar topicCount={topicCount} />
      </div>

      <div className={`lf-mobile-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      <div className={`lf-sidebar-wrap mobile ${isSidebarOpen ? 'open' : ''}`}>
        <Sidebar topicCount={topicCount} onNavigate={() => setIsSidebarOpen(false)} />
      </div>

      <main className="lf-main">
        <header className="lf-topbar">
          <div className="lf-topbar-left">
            <button
              type="button"
              className="lf-menu-btn"
              aria-label="Open navigation"
              onClick={() => setIsSidebarOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>
            <div>
              <p className="lf-topbar-title">{title}</p>
              {subtitle ? <p className="lf-topbar-subtitle">{subtitle}</p> : null}
            </div>
          </div>
          <div className="lf-topbar-right">
            {topbarExtras}
            {showCreateTopicButton ? (
              <button type="button" className="lf-primary-btn" onClick={() => navigate('/topics/create')}>
                + New topic
              </button>
            ) : null}
          </div>
        </header>
        <section className="lf-main-content">{children}</section>
      </main>
    </div>
  )
}

export default HomeLayout
