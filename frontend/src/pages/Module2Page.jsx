import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../api'
import { clearAuthToken, getAuthToken } from '../utils/authStorage'

function Module2Page() {
  const navigate = useNavigate()

  useEffect(() => {
    const validateSession = async () => {
      const token = getAuthToken()
      if (!token) {
        navigate('/', { replace: true })
        return
      }

      try {
        await getCurrentUser(token)
      } catch (error) {
        if (error?.response?.status === 401) {
          clearAuthToken()
          navigate('/', { replace: true })
        }
      }
    }

    validateSession()
  }, [navigate])

  return (
    <main className="app-shell page">
      <section className="card" aria-labelledby="module2-title">
        <h1 id="module2-title" className="page-title">Module 2</h1>
        <p className="page-subtitle">Under construction</p>
      </section>
    </main>
  )
}

export default Module2Page
