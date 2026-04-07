import httpClient from '../services/httpClient'
import {
  checkVerifyStatus,
  getCurrentUser,
  loginUser,
  logoutUser,
  oauthLogin,
  registerUser,
  resendVerificationEmail,
} from './auth'
import {
  completeTask,
  generateSummary,
  getChatHistory,
  getDayExecution,
  getNotes,
  getSummary,
  saveNotes,
  streamChatMessage,
  submitDepth,
  submitPractical,
  submitQuiz,
} from './execution'
import { createTopic, getTopicStatus, getTopics, retryTopic } from './topic'
import { deleteUserAccount, getUserProfile, updateUserProfile } from './user'

export {
  checkVerifyStatus,
  completeTask,
  createTopic,
  deleteUserAccount,
  generateSummary,
  getChatHistory,
  getDayExecution,
  getNotes,
  getSummary,
  getTopicStatus,
  getTopics,
  getUserProfile,
  getCurrentUser,
  httpClient,
  loginUser,
  logoutUser,
  oauthLogin,
  registerUser,
  resendVerificationEmail,
  retryTopic,
  saveNotes,
  streamChatMessage,
  submitDepth,
  submitPractical,
  submitQuiz,
  updateUserProfile,
}
