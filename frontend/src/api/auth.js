import httpClient from '../services/httpClient'

export const registerUser = (payload) => httpClient.post('/auth/register', payload)
export const getRegistrationAvailability = () => httpClient.get('/auth/registration-availability')
export const loginUser = (payload) => httpClient.post('/auth/login', payload)
export const oauthLogin = (payload) => httpClient.post('/auth/oauth', payload)
export const getCurrentUser = (token) =>
  httpClient.get('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
export const logoutUser = () => httpClient.post('/auth/logout')
export const checkVerifyStatus = (email) =>
  httpClient.get('/auth/checkstatus', { headers: { 'x-user-email': email } })
export const resendVerificationEmail = (payload) =>
  httpClient.post('/auth/resend', payload)
