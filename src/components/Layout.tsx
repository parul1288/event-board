import { useParams, NavLink, Link } from 'react-router-dom'
import { useEventStore } from '../store/eventStore'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { id } = useParams<{ id: string }>()
  const currentEvent = useEventStore((s) => s.currentEvent)

  const tabs = [
    {
      label: 'My Events',
      to: '/',
      end: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      ),
    },
    {
      label: 'Board',
      to: `/event/${id}`,
      end: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      label: 'Decisions',
      to: `/event/${id}/decisions`,
      end: false,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
    },
    {
      label: 'Tasks',
      to: `/event/${id}/assignments`,
      end: false,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: 'Expenses',
      to: `/event/${id}/expenses`,
      end: false,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      ),
    },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top header — breadcrumb */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-2 sticky top-0 z-10">
        {/* Breadcrumb */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Link
              to="/"
              className="text-sm font-medium text-accent-600 hover:text-accent-700 transition-colors shrink-0"
            >
              Event Board
            </Link>
            <span className="text-gray-300 text-sm select-none shrink-0">›</span>
            <span className="text-sm font-semibold text-gray-900 truncate">
              {currentEvent?.name ?? 'Loading…'}
            </span>
          </div>
          {currentEvent?.invite_code && (
            <p className="text-xs text-gray-400 mt-0.5">Code: {currentEvent.invite_code}</p>
          )}
        </div>

        {/* Right-side actions */}
        <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0">
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </button>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom tab bar — 5 tabs */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 safe-bottom z-10">
        <div className="flex">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                  isActive ? 'text-accent-600' : 'text-gray-400 hover:text-gray-600'
                }`
              }
            >
              {tab.icon}
              <span className="text-[9px] font-medium">{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
