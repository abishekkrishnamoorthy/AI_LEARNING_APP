import httpClient from '../services/httpClient'

export const createTopic = (payload) => httpClient.post('/topic/create', payload)
export const getTopics = () => httpClient.get('/topic')
export const getTopicStatus = (topicId) => httpClient.get(`/topic/${topicId}/status`)
export const retryTopic = (topicId) => httpClient.post(`/topic/${topicId}/retry`)
