import { useState } from 'react'
import { useParams, NavLink, Link, useNavigate } from 'react-router-dom'
import { useEventStore } from '../store/eventStore'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { id } = useParams<{ id: string }>()
  const currentEvent = useEventStore((s) => s.currentEvent)
  const clearEvent = useEventStore((s) => s.clearEvent)
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const authDisplayName =
    ((user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? '') as string).trim() ||
    user?.email?.split('@')[0] ||
    null

  const isCreator = !!(user && currentEvent?.created_by_auth_id === user.id)

  const [showMenu, setShowMenu] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)
  // Leave confirmation
  const [leaveConfirm, setLeaveConfirm] = useState(false)
  // Delete confirmation: 0 = button, 1 = warning+confirm
  const [deleteStep, setDeleteStep] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)

  const closeMenu = () => {
    setShowMenu(false)
    setLeaveConfirm(false)
    setDeleteStep(0)
  }

  const handleLeave = async () => {
    if (!id || !user?.id) return
    setActionLoading(true)
    await supabase
      .from('participants')
      .update({ is_active: false })
      .eq('auth_user_id', user.id)
      .eq('event_id', id)
    setActionLoading(false)
    clearEvent()
    closeMenu()
    navigate('/', { replace: true })
  }

  const handleDelete = async () => {
    if (!id) return
    setActionLoading(true)
    const { error } = await supabase.from('events').delete().eq('id', id)
    setActionLoading(false)
    if (error) {
      console.error('Delete failed:', error)
      alert('Could not delete event: ' + error.message)
      return
    }
    clearEvent()
    closeMenu()
    navigate('/', { replace: true })
  }

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/event/${id}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setShowMenu(false)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const tabs = [
    {
      label: 'My Events',
      to: '/',
      end: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      label: 'Tasks',
      to: `/event/${id}/assignments`,
      end: false,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Expenses',
      to: `/event/${id}/expenses`,
      end: false,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top header — breadcrumb */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-2 sticky top-0 z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Link to="/" className="text-sm font-medium text-accent-600 hover:text-accent-700 transition-colors shrink-0">
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

        {/* Hamburger / dots — now wired */}
        <button
          onClick={() => setShowMenu(true)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom tab bar */}
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

      {/* ── Hamburger menu sheet ──────────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 bg-black/40 z-20 transition-opacity duration-200 ${
          showMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMenu}
      />
      <div
        className={`fixed bottom-0 inset-x-0 bg-white rounded-t-2xl z-30 transition-transform duration-300 ease-out ${
          showMenu ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-4 pt-2 pb-8 space-y-1">
          {/* Signed-in user */}
          {(authDisplayName || user?.email) && (
            <div className="px-4 py-3 mb-1 border-b border-gray-100">
              {authDisplayName && (
                <p className="text-sm font-semibold text-gray-900 truncate">{authDisplayName}</p>
              )}
              {user?.email && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{user.email}</p>
              )}
            </div>
          )}

          {/* Participants */}
          <button
            onClick={() => { navigate(`/event/${id}/participants`); setShowMenu(false) }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
          >
            <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            <span className="text-sm font-medium text-gray-900">Participants</span>
            <svg className="w-4 h-4 text-gray-400 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Copy invite link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
          >
            <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </span>
            <span className="text-sm font-medium text-gray-900">Copy invite link</span>
          </button>

          {/* Event details */}
          <button
            onClick={() => { setShowDetails(true); setShowMenu(false) }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
          >
            <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <span className="text-sm font-medium text-gray-900">Event details</span>
            <svg className="w-4 h-4 text-gray-400 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Divider */}
          <div className="h-px bg-gray-100 my-1" />

          {/* ── Leave / Delete event ─────────────────────────────────────────── */}
          {isCreator ? (
            /* Creator: Delete event (two-step) */
            deleteStep === 0 ? (
              <button
                onClick={() => setDeleteStep(1)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-red-50 transition-colors text-left"
              >
                <span className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </span>
                <span className="text-sm font-medium text-red-600">Delete event</span>
              </button>
            ) : (
              <div className="px-4 py-3 space-y-3 bg-red-50 rounded-xl mx-0">
                <p className="text-xs font-semibold text-red-700">Delete this event?</p>
                <p className="text-xs text-red-600 leading-relaxed">
                  This will permanently delete the event, all decisions, tasks and expenses. This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeleteStep(0)}
                    disabled={actionLoading}
                    className="flex-1 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={actionLoading}
                    className="flex-1 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {actionLoading ? (
                      <span className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />
                    ) : null}
                    Yes, delete everything
                  </button>
                </div>
              </div>
            )
          ) : (
            /* Non-creator: Leave event */
            leaveConfirm ? (
              <div className="px-4 py-3 space-y-3 bg-amber-50 rounded-xl mx-0">
                <p className="text-xs font-semibold text-amber-800">Leave this event?</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Your contributions will remain visible to the group but you'll lose access.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLeaveConfirm(false)}
                    disabled={actionLoading}
                    className="flex-1 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLeave}
                    disabled={actionLoading}
                    className="flex-1 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {actionLoading ? (
                      <span className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />
                    ) : null}
                    Yes, leave
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setLeaveConfirm(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-amber-50 transition-colors text-left"
              >
                <span className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </span>
                <span className="text-sm font-medium text-amber-700">Leave event</span>
              </button>
            )
          )}

          {/* Divider */}
          <div className="h-px bg-gray-100 my-1" />

          {/* Sign out */}
          <button
            onClick={async () => {
              closeMenu()
              await signOut()
              navigate('/login', { replace: true })
            }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-red-50 transition-colors text-left"
          >
            <span className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </span>
            <span className="text-sm font-medium text-red-600">Sign out</span>
          </button>
        </div>
      </div>

      {/* ── Event details modal ───────────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-200 ${
          showDetails ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowDetails(false)}
      />
      <div
        className={`fixed bottom-0 inset-x-0 bg-white rounded-t-2xl z-50 transition-transform duration-300 ease-out ${
          showDetails ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-4 pt-2 pb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Event details</h2>
          <button onClick={() => setShowDetails(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 pb-10 space-y-3">
          <DetailRow label="Event name" value={currentEvent?.name} />
          <DetailRow label="Date" value={fmtDate(currentEvent?.date)} />
          <DetailRow label="Location" value={currentEvent?.location} />
          <DetailRow
            label="Expected guests"
            value={currentEvent?.guest_count ? String(currentEvent.guest_count) : null}
          />
          <DetailRow label="Invite code" value={currentEvent?.invite_code} mono />
        </div>
      </div>

      {/* ── Link copied toast ─────────────────────────────────────────────────── */}
      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-full z-50 transition-all duration-300 ${
          copied ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        Link copied!
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value?: string | null
  mono?: boolean
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-400 w-28 shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-gray-900 ${mono ? 'font-mono tracking-wider' : ''}`}>{value}</span>
    </div>
  )
}
