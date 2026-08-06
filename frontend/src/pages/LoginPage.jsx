import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getRegistrationAvailability, getUserProfile, loginUser, oauthLogin, registerUser } from '../api'
import { VerifyPanel } from '../components'
import fallbackLogo from '../assets/react.svg'
import { getAuthToken, setAuthToken, setAuthUser } from '../utils/authStorage'

const initialLoginForm = {
  email: '',
  password: '',
}

const initialRegisterForm = {
  email: '',
  password: '',
  confirm: '',
}

const GOOGLE_SCRIPT_ID = 'google-identity-services'
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const CURRENT_ORIGIN =
  typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'unknown-origin'
const REGISTRATION_LIMIT_MESSAGE =
  'Prototype registration limit has been reached. This demo currently supports only 10 registered users.'
const REGISTRATION_LIMIT_POPUP_MESSAGE =
  'This prototype demo currently supports only 10 registered users. Registration is temporarily closed, but existing users can still log in and continue learning.'

const getGoogleIdentity = () => {
  if (typeof window === 'undefined') {
    return null
  }

  return window.google?.accounts?.id || null
}

function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [authMode, setAuthMode] = useState('login')
  const [loginForm, setLoginForm] = useState(initialLoginForm)
  const [registerForm, setRegisterForm] = useState(initialRegisterForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [logoSrc, setLogoSrc] = useState('/assets/alt-logo.png')
  const [showVerify, setShowVerify] = useState(false)
  const [verifyEmail, setVerifyEmail] = useState('')
  const [isGoogleScriptReady, setIsGoogleScriptReady] = useState(Boolean(getGoogleIdentity()))
  const [registrationAvailability, setRegistrationAvailability] = useState({
    available: true,
    message: '',
  })
  const [showRegistrationLimitModal, setShowRegistrationLimitModal] = useState(false)
  const googleInitializedRef = useRef(false)

  useEffect(() => {
    if (getAuthToken()) {
      navigate('/home', { replace: true })
      return
    }
    if (location?.state?.authMode === 'register') {
      setAuthMode('register')
    }
    if (location?.state?.message) {
      setStatus({ type: 'success', message: location.state.message })
    }
  }, [location, navigate])

  useEffect(() => {
    let isMounted = true

    const loadRegistrationAvailability = async () => {
      try {
        const response = await getRegistrationAvailability()
        if (!isMounted) return
        setRegistrationAvailability({
          available: response?.data?.available !== false,
          message: response?.data?.message || '',
        })
      } catch {
        if (!isMounted) return
        setRegistrationAvailability({ available: true, message: '' })
      }
    }

    loadRegistrationAvailability()

    return () => {
      isMounted = false
    }
  }, [])

  const title = useMemo(() => {
    return authMode === 'login' ? 'Welcome back' : 'Create your account'
  }, [authMode])

  const subtitle = useMemo(() => {
    return authMode === 'login'
      ? 'Login to continue your learning workflow.'
      : 'Register and verify your email to get started.'
  }, [authMode])

  const isRegistrationClosed = registrationAvailability.available === false
  const registrationLimitMessage = registrationAvailability.message || REGISTRATION_LIMIT_MESSAGE
  const isRegisterMode = authMode === 'register'
  const isGoogleDisabled = isSubmitting || (isRegisterMode && isRegistrationClosed)

  const showLimitPopup = () => {
    setShowRegistrationLimitModal(true)
  }

  const redirectAfterAuth = async () => {
    const profileResponse = await getUserProfile()
    const user = profileResponse?.data?.user
    if (user) {
      setAuthUser(user)
    }

    if (!user?.isProfileComplete) {
      navigate('/profile-setup', { replace: true })
      return
    }

    navigate('/home', { replace: true })
  }

  const handleOAuthSuccess = useCallback(
    async (credential) => {
      if (!credential) {
        setStatus({ type: 'error', message: 'Google login failed: credential missing.' })
        return
      }

      try {
        setIsSubmitting(true)
        const response = await oauthLogin({ credential })
        const token = response?.data?.token

        if (!token) {
          setStatus({ type: 'error', message: 'Google login succeeded but token is missing.' })
          return
        }

        setAuthToken(token)
        await redirectAfterAuth()
      } catch (error) {
        if (error?.response?.status === 403 && error?.response?.data?.message === REGISTRATION_LIMIT_MESSAGE) {
          showLimitPopup()
        }
        setStatus({
          type: 'error',
          message: error?.response?.data?.message || 'Google login failed. Please try again.',
        })
      } finally {
        setIsSubmitting(false)
      }
    },
    [navigate],
  )

  const initializeGoogleIdentity = useCallback(() => {
    if (!GOOGLE_CLIENT_ID) {
      return false
    }

    if (googleInitializedRef.current) {
      return true
    }

    const googleIdentity = getGoogleIdentity()
    if (!googleIdentity) {
      return false
    }

    googleIdentity.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => handleOAuthSuccess(response?.credential),
      ux_mode: 'popup',
      auto_select: false,
      cancel_on_tap_outside: true,
    })

    googleInitializedRef.current = true
    return true
  }, [handleOAuthSuccess])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return
    }

    if (getGoogleIdentity()) {
      setIsGoogleScriptReady(true)
      return
    }

    let script = document.getElementById(GOOGLE_SCRIPT_ID)
    if (!script) {
      script = document.createElement('script')
      script.id = GOOGLE_SCRIPT_ID
      script.src = GOOGLE_SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    const onLoad = () => setIsGoogleScriptReady(true)
    const onError = () => {
      setStatus({ type: 'error', message: 'Failed to load Google sign-in script.' })
    }

    script.addEventListener('load', onLoad)
    script.addEventListener('error', onError)

    return () => {
      script?.removeEventListener('load', onLoad)
      script?.removeEventListener('error', onError)
    }
  }, [])

  useEffect(() => {
    if (!isGoogleScriptReady || googleInitializedRef.current) {
      return
    }

    if (!initializeGoogleIdentity()) {
      setStatus({ type: 'error', message: 'Unable to initialize Google login.' })
    }
  }, [initializeGoogleIdentity, isGoogleScriptReady])

  const onGoogleLogin = () => {
    if (isRegisterMode && isRegistrationClosed) {
      showLimitPopup()
      return
    }

    if (!GOOGLE_CLIENT_ID) {
      setStatus({
        type: 'error',
        message: 'Google login is not configured. Set VITE_GOOGLE_CLIENT_ID in frontend env.',
      })
      return
    }

    if (!initializeGoogleIdentity()) {
      setStatus({ type: 'error', message: 'Google login is not ready. Please refresh and try again.' })
      return
    }

    const googleIdentity = getGoogleIdentity()
    if (!googleIdentity) {
      setStatus({ type: 'error', message: 'Google login is unavailable in this browser.' })
      return
    }

    setStatus({ type: 'info', message: 'Continue in the Google popup to finish sign-in.' })

    googleIdentity.prompt((notification) => {
      if (notification.isNotDisplayed?.()) {
        const reason = notification.getNotDisplayedReason?.() || 'unknown reason'
        if (reason === 'unregistered_origin') {
          setStatus({
            type: 'error',
            message: `Google sign-in blocked: unregistered_origin. Add ${CURRENT_ORIGIN} to Authorized JavaScript origins in Google Cloud Console.`,
          })
          return
        }

        setStatus({
          type: 'error',
          message: `Google sign-in popup not shown (${reason}) on ${CURRENT_ORIGIN}.`,
        })
      }
    })
  }

  const onLoginSubmit = async (event) => {
    event.preventDefault()
    setStatus({ type: '', message: '' })

    const email = loginForm.email.trim()
    const password = loginForm.password

    if (!email || !password) {
      setStatus({ type: 'error', message: 'Email and password are required.' })
      return
    }

    try {
      setIsSubmitting(true)
      const response = await loginUser({ email, password })
      const token = response?.data?.token

      if (!token) {
        setStatus({ type: 'error', message: 'Login succeeded but token is missing.' })
        return
      }

      setAuthToken(token)
      await redirectAfterAuth()
    } catch (error) {
      setStatus({
        type: 'error',
        message: error?.response?.data?.message || 'Login failed. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const onRegisterSubmit = async (event) => {
    event.preventDefault()
    setStatus({ type: '', message: '' })

    if (isRegistrationClosed) {
      showLimitPopup()
      return
    }

    const email = registerForm.email.trim()
    const password = registerForm.password
    const confirm = registerForm.confirm

    if (!email || !password || !confirm) {
      setStatus({ type: 'error', message: 'Email, password, and confirm are required.' })
      return
    }

    if (password !== confirm) {
      setStatus({ type: 'error', message: 'Confirm password must match password.' })
      return
    }

    try {
      setIsSubmitting(true)
      const response = await registerUser({ email, password })
      setStatus({
        type: 'success',
        message: response?.data?.message || 'Registration successful. Please verify your email.',
      })
      setRegisterForm(initialRegisterForm)
      setVerifyEmail(email)
      setShowVerify(true)
    } catch (error) {
      if (error?.response?.status === 403 && error?.response?.data?.message === REGISTRATION_LIMIT_MESSAGE) {
        showLimitPopup()
      }
      setStatus({
        type: 'error',
        message: error?.response?.data?.message || 'Registration failed. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifySuccess = () => {
    setShowVerify(false)
    setAuthMode('login')
    setStatus({ type: 'success', message: 'Email verified. You can now log in.' })
  }

  return (
    <main className="landing-page">
      <section className="landing-left">
        <div className="landing-left-inner">
          <img
            className="landing-logo"
            src={logoSrc}
            alt="ALT logo"
            onError={() => setLogoSrc(fallbackLogo)}
          />
          <h1 className="landing-brand">AI Learning Productivity System</h1>
          <p className="landing-tagline">Plan. Learn. Execute. Improve.</p>
        </div>
      </section>

      <section className="landing-right">
        <article className="auth-card" aria-labelledby="auth-title">
          <h2 id="auth-title" className="auth-title">{title}</h2>
          <p className="auth-subtitle">{subtitle}</p>

          <button type="button" className="btn btn-google" onClick={onGoogleLogin} disabled={isGoogleDisabled}>
            <span className="google-icon" aria-hidden="true">G</span>
            Sign in with Google
          </button>
          {isRegisterMode && isRegistrationClosed ? (
            <p className="status status-error">Registration is closed for this prototype. Existing users can still log in.</p>
          ) : null}

          <div className="auth-divider" role="separator" aria-label="or">
            <span>OR</span>
          </div>

          {authMode === 'login' ? (
            <form className="form-grid" onSubmit={onLoginSubmit} noValidate>
              <div className="field">
                <label htmlFor="loginEmail">Email</label>
                <input
                  id="loginEmail"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={loginForm.email}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="name@example.com"
                />
              </div>

              <div className="field">
                <label htmlFor="loginPassword">Password</label>
                <input
                  id="loginPassword"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Enter password"
                />
              </div>

              <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                Login
              </button>
            </form>
          ) : (
            <form className="form-grid" onSubmit={onRegisterSubmit} noValidate>
              <div className="field">
                <label htmlFor="registerEmail">Email</label>
                <input
                  id="registerEmail"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={registerForm.email}
                  onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="name@example.com"
                />
              </div>

              <div className="field">
                <label htmlFor="registerPassword">Password</label>
                <input
                  id="registerPassword"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={registerForm.password}
                  onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Enter password"
                />
              </div>

              <div className="field">
                <label htmlFor="registerConfirm">Confirm</label>
                <input
                  id="registerConfirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={registerForm.confirm}
                  onChange={(event) => setRegisterForm((prev) => ({ ...prev, confirm: event.target.value }))}
                  placeholder="Re-enter password"
                />
              </div>

              <button className="btn btn-primary" type="submit" disabled={isSubmitting || isRegistrationClosed}>
                {isSubmitting ? 'Registering...' : 'Register'}
              </button>
              {isRegistrationClosed ? (
                <p className="status status-error">This prototype is full. Please use an existing account to log in.</p>
              ) : null}
            </form>
          )}

          {status.message ? <p className={`status status-${status.type}`}>{status.message}</p> : null}

          <p className="auth-switch-text">
            {authMode === 'login' ? "Don't have account?" : 'Already have account?'}{' '}
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'))}
            >
              {authMode === 'login' ? 'Register' : 'Login'}
            </button>
          </p>
        </article>
      </section>
      {showVerify ? (
        <VerifyPanel email={verifyEmail} onVerified={handleVerifySuccess} onClose={() => setShowVerify(false)} />
      ) : null}
      {showRegistrationLimitModal ? (
        <div
          className="verify-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="registration-limit-title"
          onClick={() => setShowRegistrationLimitModal(false)}
        >
          <section className="verify-panel" onClick={(event) => event.stopPropagation()}>
            <h2 id="registration-limit-title">Prototype User Limit Reached</h2>
            <p>{REGISTRATION_LIMIT_POPUP_MESSAGE}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setShowRegistrationLimitModal(false)
                setAuthMode('login')
                setStatus({ type: '', message: '' })
              }}
            >
              Back to Login
            </button>
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default LoginPage
