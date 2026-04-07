import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import ContinuePage from './pages/ContinuePage.jsx'
import CreateTopic from './pages/CreateTopic.jsx'
import DayExecution from './pages/DayExecution.jsx'
import DocumentsPage from './pages/DocumentsPage.jsx'
import HomePageV2 from './pages/HomePageV2.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import ProfileSetupPage from './pages/ProfileSetupPage.jsx'
import TopicsPage from './pages/TopicsPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route
        path="/profile-setup"
        element={
          <ProtectedRoute>
            <ProfileSetupPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <HomePageV2 />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={<Navigate to="/home" replace />}
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <DocumentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/continue"
        element={
          <ProtectedRoute>
            <ContinuePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/topic/create"
        element={
          <ProtectedRoute>
            <CreateTopic />
          </ProtectedRoute>
        }
      />
      <Route
        path="/topics/create"
        element={
          <ProtectedRoute>
            <CreateTopic />
          </ProtectedRoute>
        }
      />
      <Route
        path="/topics/create/status/:topicId"
        element={
          <ProtectedRoute>
            <CreateTopic />
          </ProtectedRoute>
        }
      />
      <Route
        path="/topics"
        element={
          <ProtectedRoute>
            <TopicsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/topic/:topicId/cycle/:cycleId/day/:dayNumber"
        element={
          <ProtectedRoute>
            <DayExecution />
          </ProtectedRoute>
        }
      />
      <Route path="/topic/:topicId/report" element={<Navigate to="/home" replace />} />
      <Route path="/module2" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<NotFoundPage />} />
      <Route path="/landing" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
