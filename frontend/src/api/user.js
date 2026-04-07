import httpClient from '../services/httpClient'

export const getUserProfile = () => httpClient.get('/user/me')
export const updateUserProfile = (payload) => httpClient.put('/user/profile', payload)
export const deleteUserAccount = () => httpClient.delete('/user/delete')

