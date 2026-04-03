import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { User } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserEvent {
  eventId: string
  name: string
  date: string | null
  isCreator: boolean
  participantCount: number
  openDecisions: number
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [events, setEvents] = useState<UserEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showJoin, setShowJoin] = useState(false)

  const displayName =
    ((user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? '') as string)
      .split(' ')[0]
      .trim() ||
    user?.email?.split('@')[0] ||
    ''

  useEffect(() => {
    if (user) loadEvents()
  }, [user])

  const loadEvents = async () => {
    if (!user) return
    setLoading(true)

    // Fetch all participant records for this auth user with their events
    const { data, error } = await supabase
      .from('participants')
      .select('id, event_id, is_active, events(id, name, date, created_by_auth_id)')
      .eq('auth_user_id', user.id)

    if (error || !data) {
      setLoading(false)
      return
    }

    // Treat null is_active as active (graceful if column doesn't exist yet)
    const active = data.filter((p) => p.is_active !== false)

    if (active.length === 0) {
      setEvents([])
      setLoading(false)
      return
    }

    const eventIds = active.map((p) => p.event_id)

    // Fetch stats in parallel: participant counts + open decision counts
    const [{ data: partRows }, { data: decisionRows }] = await Promise.all([
      supabase
        .from('participants')
        .select('event_id')
        .in('event_id', eventIds)
        .or('is_active.eq.true,is_active.is.null'),
      supabase
        .from('decisions')
        .select('event_id')
        .in('event_id', eventIds)
        .eq('is_locked', false),
    ])

    const partCounts: Record<string, number> = {}
    partRows?.forEach((r) => {
      partCounts[r.event_id] = (partCounts[r.event_id] ?? 0) + 1
    })

    const decisionCounts: Record<string, number> = {}
    decisionRows?.forEach((r) => {
      decisionCounts[r.event_id] = (decisionCounts[r.event_id] ?? 0) + 1
    })

    const cards: UserEvent[] = active.map((p) => {
      const ev = p.events as { id: string; name: string; date: string | null; created_by_auth_id: string | null }
      return {
        eventId: p.event_id,
        name: ev?.name ?? 'Unknown event',
        date: ev?.date ?? null,
        isCreator: ev?.created_by_auth_id === user.id,
        participantCount: partCounts[p.event_id] ?? 0,
        openDecisions: decisionCounts[p.event_id] ?? 0,
      }
    })

    setEvents(cards)
    setLoading(false)
  }

  return (
    <>
      {loading ? (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <span className="w-6 h-6 border-2 border-accent-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <WelcomeView
          user={user}
          displayName={displayName}
          onCreateClick={() => navigate('/create')}
          onJoinClick={() => setShowJoin(true)}
        />
      ) : (
        <DashboardView
          events={events}
          displayName={displayName}
          user={user}
          onCreateClick={() => navigate('/create')}
          onJoinClick={() => setShowJoin(true)}
          onEventClick={(id) => navigate(`/event/${id}`)}
        />
      )}

      <JoinSheet
        isOpen={showJoin}
        onClose={() => setShowJoin(false)}
        onJoin={(eventId) => {
          setShowJoin(false)
          navigate(`/event/${eventId}`)
        }}
      />
    </>
  )
}

// ─── Welcome view (first visit / no events) ───────────────────────────────────

function WelcomeView({
  user,
  displayName,
  onCreateClick,
  onJoinClick,
}: {
  user: User | null
  displayName: string
  onCreateClick: () => void
  onJoinClick: () => void
}) {
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const fullName = ((user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? '') as string).trim()
  const avatarInitial = fullName[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent-600 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-900">Event Board</span>
        </div>
        <button
          onClick={() => setShowUserMenu(true)}
          className="w-8 h-8 rounded-full bg-accent-100 text-accent-700 text-sm font-bold flex items-center justify-center hover:bg-accent-200 transition-colors shrink-0"
        >
          {avatarInitial}
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-xs text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-600 mb-5 shadow-lg shadow-accent-600/20">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>

          {displayName ? (
            <>
              <h1 className="text-2xl font-semibold text-gray-900">Hi, {displayName}!</h1>
              <p className="text-sm text-gray-500 mt-2 mb-10 leading-relaxed">
                Create an event or join one to get started.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-gray-900">Event Board</h1>
              <p className="text-sm text-gray-500 mt-2 mb-10 leading-relaxed">
                Plan events together — polls, tasks,&nbsp;and expenses in one place.
              </p>
            </>
          )}

          <button
            onClick={onCreateClick}
            className="w-full py-3.5 bg-accent-600 hover:bg-accent-700 active:bg-accent-800 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create New Event
          </button>

          <button
            onClick={onJoinClick}
            className="mt-3 w-full py-3 text-sm font-medium text-gray-500 hover:text-accent-600 transition-colors"
          >
            Join with invite code
          </button>
        </div>
      </div>

      {/* User menu sheet */}
      <UserMenuSheet
        isOpen={showUserMenu}
        onClose={() => setShowUserMenu(false)}
        user={user}
        fullName={fullName}
        avatarInitial={avatarInitial}
        onSignOut={handleSignOut}
        signingOut={signingOut}
      />
    </div>
  )
}

// ─── Dashboard view (has events) ─────────────────────────────────────────────

interface DashboardViewProps {
  events: UserEvent[]
  displayName: string
  user: User | null
  onCreateClick: () => void
  onJoinClick: () => void
  onEventClick: (id: string) => void
}

function DashboardView({
  events,
  displayName,
  user,
  onCreateClick,
  onJoinClick,
  onEventClick,
}: DashboardViewProps) {
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const fullName = ((user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? '') as string).trim()
  const avatarInitial = fullName[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* App header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent-600 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-900">Event Board</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCreateClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New
          </button>

          <button
            onClick={() => setShowUserMenu(true)}
            className="w-8 h-8 rounded-full bg-accent-100 text-accent-700 text-sm font-bold flex items-center justify-center hover:bg-accent-200 transition-colors shrink-0"
            aria-label="Account"
          >
            {avatarInitial}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 pt-5 pb-10">
        {/* Greeting */}
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-gray-900">
            {displayName ? `Welcome back, ${displayName} 👋` : 'Welcome back'}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Event cards */}
        <div className="space-y-3">
          {events.map((event) => (
            <button
              key={event.eventId}
              onClick={() => onEventClick(event.eventId)}
              className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-accent-300 hover:shadow-sm transition-all active:scale-[0.98]"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold text-gray-900 leading-snug">{event.name}</h3>
                <span
                  className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                    event.isCreator
                      ? 'bg-accent-100 text-accent-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {event.isCreator ? 'Created by you' : 'Joined'}
                </span>
              </div>

              {event.date && (
                <p className="text-xs text-gray-400 mb-2">{fmtDate(event.date)}</p>
              )}

              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {event.participantCount} {event.participantCount === 1 ? 'person' : 'people'}
                </span>
                <span className="text-gray-300">·</span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {event.openDecisions} open {event.openDecisions === 1 ? 'decision' : 'decisions'}
                </span>
              </div>

              <div className="flex justify-end mt-3">
                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Join another event */}
        <button
          onClick={onJoinClick}
          className="mt-5 w-full py-3.5 text-sm font-medium text-gray-500 hover:text-accent-600 border border-dashed border-gray-300 hover:border-accent-400 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Join another event with a code
        </button>
      </div>

      {/* User menu sheet */}
      <UserMenuSheet
        isOpen={showUserMenu}
        onClose={() => setShowUserMenu(false)}
        user={user}
        fullName={fullName}
        avatarInitial={avatarInitial}
        onSignOut={handleSignOut}
        signingOut={signingOut}
      />
    </div>
  )
}

// ─── Shared user menu sheet ───────────────────────────────────────────────────

function UserMenuSheet({
  isOpen,
  onClose,
  user,
  fullName,
  avatarInitial,
  onSignOut,
  signingOut,
}: {
  isOpen: boolean
  onClose: () => void
  user: User | null
  fullName: string
  avatarInitial: string
  onSignOut: () => void
  signingOut: boolean
}) {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 inset-x-0 bg-white rounded-t-2xl z-50 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-5 pt-3 pb-4 flex items-center gap-3 border-b border-gray-100">
          <div className="w-11 h-11 rounded-full bg-accent-100 text-accent-700 text-base font-bold flex items-center justify-center shrink-0">
            {avatarInitial}
          </div>
          <div className="min-w-0">
            {fullName && <p className="text-sm font-semibold text-gray-900 truncate">{fullName}</p>}
            {user?.email && <p className="text-xs text-gray-400 mt-0.5 truncate">{user.email}</p>}
          </div>
        </div>

        <div className="px-4 py-3 pb-10">
          <button
            onClick={onSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-red-50 transition-colors text-left disabled:opacity-60"
          >
            <span className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </span>
            <span className="text-sm font-medium text-red-600">
              {signingOut ? 'Signing out…' : 'Sign out'}
            </span>
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Join sheet ───────────────────────────────────────────────────────────────

function JoinSheet({
  isOpen,
  onClose,
  onJoin,
}: {
  isOpen: boolean
  onClose: () => void
  onJoin: (eventId: string) => void
}) {
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    } else {
      setInviteCode('')
      setError(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = inviteCode.trim().toUpperCase()
    if (!code) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('events')
      .select('id, name')
      .eq('invite_code', code)
      .single()
    setLoading(false)
    if (error || !data) {
      setError('Event not found. Check the code and try again.')
      return
    }
    onJoin(data.id)
    onClose()
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-20 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 inset-x-0 bg-white rounded-t-2xl z-30 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="px-4 pt-2 pb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Join an event</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 pb-8 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Invite code
            </label>
            <input
              ref={inputRef}
              type="text"
              value={inviteCode}
              onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setError(null) }}
              placeholder="e.g. ABC123"
              className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent font-mono tracking-wider uppercase"
              autoCapitalize="characters"
            />
          </div>

          {error && <p className="text-sm text-red-500 px-1">{error}</p>}

          <button
            type="submit"
            disabled={loading || !inviteCode.trim()}
            className="w-full py-3.5 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Looking up event…
              </>
            ) : (
              'Find Event'
            )}
          </button>
        </form>
      </div>
    </>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
