import { useEffect, useRef, useState } from 'react'
import { checkVerifyStatus, resendVerificationEmail } from '../../api'

const RESEND_COOLDOWN_SECONDS = 10
const POLLING_INTERVAL_MS = 3000

function VerifyPanel({ email, onVerified, onClose }) {
  const [isVerified, setIsVerified] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState('checking')
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [isResending, setIsResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const verifiedTimeoutRef = useRef(null)
  const isCheckingRef = useRef(false)

  useEffect(() => {
    if (!email || isVerified) {
      return undefined
    }

    let isActive = true

    const checkStatus = async () => {
      if (isCheckingRef.current) {
        return
      }

      isCheckingRef.current = true

      try {
        const response = await checkVerifyStatus(email)
        if (!isActive) {
          return
        }
        const status = response?.data?.status
        const verified = Boolean(response?.data?.verified)
        setErrorMessage('')

        if (status === 'verified' || status === 'pending' || status === 'not_found') {
          setVerifyStatus(status)
        } else {
          setErrorMessage('Unexpected response while checking verification status.')
        }

        if (verified) {
          setIsVerified(true)
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error?.response?.data?.message || 'Unable to check verification status. Retrying...',
          )
        }
      } finally {
        isCheckingRef.current = false
        if (isActive) {
          setIsCheckingStatus(false)
        }
      }
    }

    checkStatus()
    const intervalId = setInterval(checkStatus, POLLING_INTERVAL_MS)

    return () => {
      isActive = false
      clearInterval(intervalId)
    }
  }, [email, isVerified])

  useEffect(() => {
    if (cooldown <= 0) {
      return undefined
    }

    const timerId = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerId)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerId)
  }, [cooldown])

  useEffect(() => {
    if (!isVerified) {
      return undefined
    }

    verifiedTimeoutRef.current = setTimeout(() => {
      onVerified()
    }, 2000)

    return () => {
      if (verifiedTimeoutRef.current) {
        clearTimeout(verifiedTimeoutRef.current)
      }
    }
  }, [isVerified, onVerified])

  const handleResend = async () => {
    if (isResending || cooldown > 0) {
      return
    }

    setErrorMessage('')
    try {
      setIsResending(true)
      await resendVerificationEmail({ email })
      setVerifyStatus('pending')
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || 'Unable to resend verification email.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="verify-overlay" role="dialog" aria-modal="true" aria-labelledby="verify-panel-title">
      <article className={`verify-panel ${isVerified ? 'verify-panel-success' : ''}`}>
        {isVerified ? (
          <div className="verify-success">
            <div className="verify-success-icon" aria-hidden="true">
              &#10003;
            </div>
            <h3 id="verify-panel-title">Email verified</h3>
            <p>Redirecting to login...</p>
          </div>
        ) : (
          <>
            <button className="verify-close-btn" type="button" onClick={onClose} aria-label="Close">
              &#10005;
            </button>
            <h3 id="verify-panel-title">Check your email</h3>
            <p className="verify-text">We sent verification link to {email}</p>
            {verifyStatus === 'not_found' ? (
              <p className="verify-status verify-status-warning">
                No pending verification found for this email.
              </p>
            ) : (
              <>
                <p className="verify-status verify-status-pending">
                  {isCheckingStatus || verifyStatus === 'checking'
                    ? 'Checking verification status...'
                    : 'Waiting for email verification. This status will update automatically.'}
                </p>
                <div
                  className="verify-loader"
                  role="status"
                  aria-label="Checking email verification status"
                />
              </>
            )}

            <button
              className="btn btn-primary verify-resend-btn"
              type="button"
              onClick={handleResend}
              disabled={isResending || cooldown > 0}
            >
              {isResending ? 'Resending...' : cooldown > 0 ? `Resend Email (${cooldown}s)` : 'Resend Email'}
            </button>
            {errorMessage ? (
              <p className="status status-error" role="alert">
                {errorMessage}
              </p>
            ) : null}
          </>
        )}
      </article>
    </div>
  )
}

export default VerifyPanel
