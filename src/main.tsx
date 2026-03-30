import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'

import HomePage from './pages/HomePage'
import CreateEventPage from './pages/CreateEventPage'
import EventBoard from './pages/EventBoard'
import DecisionsPage from './pages/DecisionsPage'
import AssignmentsPage from './pages/AssignmentsPage'
import ExpensesPage from './pages/ExpensesPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/create',
    element: <CreateEventPage />,
  },
  {
    path: '/event/:id',
    element: <EventBoard />,
  },
  {
    path: '/event/:id/decisions',
    element: <DecisionsPage />,
  },
  {
    path: '/event/:id/assignments',
    element: <AssignmentsPage />,
  },
  {
    path: '/event/:id/expenses',
    element: <ExpensesPage />,
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
