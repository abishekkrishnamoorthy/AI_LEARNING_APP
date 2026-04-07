import { NavLink, useNavigate } from 'react-router-dom'
import { logoutUser } from '../api'
import { clearAuthSession, getAuthUser } from '../utils/authStorage'

const MENU_ITEMS = [
  { label: 'Home', to: '/home' },
  { label: 'My topics', to: '/topics', showCount: true },
  { label: 'Continue Learning', to: '/continue' },
  { label: 'Documents', to: '/documents' },
  { label: 'Profile', to: '/profile' },
]

/* eslint-disable react/prop-types */
function Sidebar({ topicCount = 0, onNavigate }) {
  const navigate = useNavigate()
  const user = getAuthUser()
  const initials = (user?.name || user?.email || 'U')
    .split(' ')
    .map((item) => item[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleLogout = async () => {
    try {
      await logoutUser()
    } catch {
      // no-op
    } finally {
      clearAuthSession()
      navigate('/login', { replace: true })
    }
  }

  return (
    <aside className="lf-sidebar">
      <div>
        <h1 className="lf-brand">LearnFlow</h1>
        <nav className="lf-nav" aria-label="Primary">
          {MENU_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) => `lf-nav-link ${isActive ? 'active' : ''}`}
            >
              <span>{item.label}</span>
              {item.showCount ? <span className="lf-topic-count">{topicCount}</span> : null}
            </NavLink>
          ))}
        </nav>
      </div>

      <div>
        <div className="lf-user-block">
          <div className="lf-avatar">{initials}</div>
          <div>
            <p className="lf-user-name">{user?.name || 'Learner'}</p>
            <p className="lf-user-level">{user?.learningLevel || 'Beginner'}</p>
          </div>
        </div>
        <button type="button" className="lf-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
