import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../api'
import { VerifyPanel } from '../components'

const initialFormState = {
  email: '',
  password: '',
  confirmPassword: '',
}

function RegisterPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showVerify, setShowVerify] = useState(false)
  const [verifyEmail, setVerifyEmail] = useState('')

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const email = formData.email.trim()
    const password = formData.password
    const confirmPassword = formData.confirmPassword

    if (!email || !password || !confirmPassword) {
      setErrorMessage('Email, password, and confirm password are required.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Confirm password must match password.')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await registerUser({ email, password })
      setSuccessMessage(response?.data?.message || 'Please verify your email.')
      setFormData(initialFormState)
      setVerifyEmail(email)
      setShowVerify(true)
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifySuccess = () => {
    setShowVerify(false)
    navigate('/', {
      state: { authMode: 'login', message: 'Email verified. You can now log in.' },
      replace: true,
    })
  }

  const handleVerifyClose = () => {
    setShowVerify(false)
  }

  return (
    <main className="app-shell page">
      <section className="card" aria-labelledby="register-title">
        <h1 id="register-title" className="page-title">Create Account</h1>
        <p className="page-subtitle">Register to get started and verify your email.</p>

        <form className="form-grid" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="name@example.com"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter password"
            />
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Re-enter password"
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Registering...' : 'Register'}
          </button>
        </form>

        {errorMessage ? <p className="status status-error">{errorMessage}</p> : null}
        {successMessage ? <p className="status status-success">{successMessage}</p> : null}

        <Link className="inline-link" to="/">
          Back to Home
        </Link>
      </section>
      {showVerify ? (
        <VerifyPanel email={verifyEmail} onVerified={handleVerifySuccess} onClose={handleVerifyClose} />
      ) : null}
    </main>
  )
}

export default RegisterPage
