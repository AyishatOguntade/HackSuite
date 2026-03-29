import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import SignIn from './pages/SignIn'
import CreateOrg from './pages/CreateOrg'
import Dashboard from './pages/Dashboard'
import AcceptInvite from './pages/AcceptInvite'
import EventLayout from './pages/events/EventLayout'
import ParticipantList from './pages/events/registration/ParticipantList'
import FormBuilder from './pages/events/registration/FormBuilder'
import LandingPageEditor from './pages/events/registration/LandingPageEditor'
import PublicRegistration from './pages/events/registration/PublicRegistration'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore()
  if (!accessToken) return <Navigate to="/signin" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/invites/:token" element={<AcceptInvite />} />
      <Route path="/events/:eventId/apply" element={<PublicRegistration />} />
      <Route
        path="/create-org"
        element={
          <RequireAuth>
            <CreateOrg />
          </RequireAuth>
        }
      />
      <Route
        path="/org/:slug/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/org/:slug/events/:eventSlug"
        element={
          <RequireAuth>
            <EventLayout />
          </RequireAuth>
        }
      >
        <Route path="registration" element={<ParticipantList />} />
        <Route path="registration/form" element={<FormBuilder />} />
        <Route path="registration/landing" element={<LandingPageEditor />} />
      </Route>
      <Route path="/" element={<Navigate to="/signin" replace />} />
    </Routes>
  )
}
