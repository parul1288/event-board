import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom'
import './index.css'

import { AuthProvider, useAuth } from './hooks/useAuth'

import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import CreateEventPage from './pages/CreateEventPage'
import EventBoard from './pages/EventBoard'
import DecisionsPage from './pages/DecisionsPage'
import AssignmentsPage from './pages/AssignmentsPage'
import ExpensesPage from './pages/ExpensesPage'
import ParticipantsPage from './pages/ParticipantsPage'

// ─── Auth guard ───────────────────────────────────────────────────────────────

const REDIRECT_KEY = 'redirectAfterLogin'

function RequireAuth() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-accent-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    // Save the intended destination so we can return here after login
    const intended = window.location.pathname + window.location.search
    localStorage.setItem(REDIRECT_KEY, intended)
    return <Navigate to="/login" replace />
  }

  // User just logged in — redirect to their intended destination if saved
  const saved = localStorage.getItem(REDIRECT_KEY)
  if (saved) {
    localStorage.removeItem(REDIRECT_KEY)
    return <Navigate to={saved} replace />
  }

  return <Outlet />
}

// ─── Router ───────────────────────────────────────────────────────────────────

const router = createBrowserRouter([
  // Public route — no auth required
  {
    path: '/login',
    element: <LoginPage />,
  },
  // All other routes require authentication
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/create', element: <CreateEventPage /> },
      { path: '/event/:id', element: <EventBoard /> },
      { path: '/event/:id/decisions', element: <DecisionsPage /> },
      { path: '/event/:id/assignments', element: <AssignmentsPage /> },
      { path: '/event/:id/expenses', element: <ExpensesPage /> },
      { path: '/event/:id/participants', element: <ParticipantsPage /> },
    ],
  },
])

// ─── Root ─────────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
