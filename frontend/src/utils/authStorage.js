const AUTH_TOKEN_KEY = 'auth_token'
const AUTH_USER_KEY = 'auth_user'

export const setAuthToken = (token) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY)

export const clearAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

export const setAuthUser = (user) => {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export const getAuthUser = () => {
  const rawUser = localStorage.getItem(AUTH_USER_KEY)
  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser)
  } catch (_error) {
    return null
  }
}

export const clearAuthUser = () => {
  localStorage.removeItem(AUTH_USER_KEY)
}

export const clearAuthSession = () => {
  clearAuthToken()
  clearAuthUser()
}

export { AUTH_TOKEN_KEY, AUTH_USER_KEY }
