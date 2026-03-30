import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  readVisited,
  upsertVisited,
  NAME_KEY,
  VISITED_KEY,
  type VisitedEvent,
} from '../lib/storage'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventStats {
  participants: number
  openPolls: number
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate()
  const [visited, setVisited] = useState<VisitedEvent[]>([])
  const [displayName, setDisplayName] = useState('')
  const [stats, setStats] = useState<Record<string, EventStats>>({})
  const [statsLoading, setStatsLoading] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  useEffect(() => {
    const events = readVisited()
    setVisited(events)
    setDisplayName(localStorage.getItem(NAME_KEY) ?? '')
    if (events.length > 0) loadStats(events.map((e) => e.id))
  }, [])

  const loadStats = async (ids: string[]) => {
    setStatsLoading(true)
    const [{ data: parts }, { data: polls }] = await Promise.all([
      supabase.from('participants').select('event_id').in('event_id', ids),
      supabase
        .from('decisions')
        .select('event_id')
        .in('event_id', ids)
        .eq('status', 'open'),
    ])
    const p: Record<string, number> = {}
    const d: Record<string, number> = {}
    parts?.forEach((x) => { p[x.event_id] = (p[x.event_id] ?? 0) + 1 })
    polls?.forEach((x) => { d[x.event_id] = (d[x.event_id] ?? 0) + 1 })
    const result: Record<string, EventStats> = {}
    ids.forEach((id) => { result[id] = { participants: p[id] ?? 0, openPolls: d[id] ?? 0 } })
    setStats(result)
    setStatsLoading(false)
  }

  const afterJoin = (eventId: string, name: string) => {
    upsertVisited({ id: eventId, name, role: 'member', visitedAt: new Date().toISOString() })
    navigate(`/event/${eventId}`)
  }

  return (
    <>
      {visited.length === 0 ? (
        <WelcomeView
          onCreateClick={() => navigate('/create')}
          onJoinClick={() => setShowJoin(true)}
        />
      ) : (
        <DashboardView
          visited={visited}
          displayName={displayName}
          stats={stats}
          statsLoading={statsLoading}
          onCreateClick={() => navigate('/create')}
          onJoinClick={() => setShowJoin(true)}
          onEventClick={(id) => navigate(`/event/${id}`)}
        />
      )}

      <JoinSheet
        isOpen={showJoin}
        onClose={() => setShowJoin(false)}
        onSuccess={afterJoin}
      />
    </>
  )
}

// ─── Welcome view (first visit) ───────────────────────────────────────────────

function WelcomeView({
  onCreateClick,
  onJoinClick,
}: {
  onCreateClick: () => void
  onJoinClick: () => void
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xs text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-600 mb-5 shadow-lg shadow-accent-600/20">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900">Event Board</h1>
        <p className="text-sm text-gray-500 mt-2 mb-10 leading-relaxed">
          Plan events together — polls, tasks,&nbsp;and expenses in one place.
        </p>

        <button
          onClick={onCreateClick}
          className="w-full py-3.5 bg-accent-600 hover:bg-accent-700 active:bg-accent-800 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
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
  )
}

// ─── Dashboard view (return visit) ───────────────────────────────────────────

interface DashboardViewProps {
  visited: VisitedEvent[]
  displayName: string
  stats: Record<string, EventStats>
  statsLoading: boolean
  onCreateClick: () => void
  onJoinClick: () => void
  onEventClick: (id: string) => void
}

function DashboardView({
  visited,
  displayName,
  stats,
  statsLoading,
  onCreateClick,
  onJoinClick,
  onEventClick,
}: DashboardViewProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* App header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent-600 flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-900">Event Board</span>
        </div>

        <button
          onClick={onCreateClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New
        </button>
      </header>

      {/* Content */}
      <div className="px-4 pt-5 pb-10">
        {/* Greeting */}
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-gray-900">
            {displayName ? `Welcome back, ${displayName} 👋` : 'Welcome back'}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {visited.length} event{visited.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Event cards */}
        <div className="space-y-3">
          {visited.map((event) => {
            const s = stats[event.id]
            return (
              <button
                key={event.id}
                onClick={() => onEventClick(event.id)}
                className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-accent-300 hover:shadow-sm transition-all active:scale-[0.98]"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 leading-snug">{event.name}</h3>
                  <span
                    className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                      event.role === 'creator'
                        ? 'bg-accent-100 text-accent-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {event.role === 'creator' ? 'Created by you' : 'Joined'}
                  </span>
                </div>

                {statsLoading && !s ? (
                  <div className="flex gap-3">
                    <div className="h-3 w-14 bg-gray-100 rounded animate-pulse" />
                    <div className="h-3 w-18 bg-gray-100 rounded animate-pulse" />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {s?.participants ?? 0}{' '}
                      {s?.participants === 1 ? 'person' : 'people'}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      {s?.openPolls ?? 0} open{' '}
                      {s?.openPolls === 1 ? 'poll' : 'polls'}
                    </span>
                  </div>
                )}

                <div className="flex justify-end mt-3">
                  <svg
                    className="w-4 h-4 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )
          })}
        </div>

        {/* Join another event */}
        <button
          onClick={onJoinClick}
          className="mt-5 w-full py-3.5 text-sm font-medium text-gray-500 hover:text-accent-600 border border-dashed border-gray-300 hover:border-accent-400 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          Join another event with a code
        </button>
      </div>
    </div>
  )
}

// ─── Join sheet ───────────────────────────────────────────────────────────────

interface JoinSheetProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (eventId: string, name: string) => void
}

function JoinSheet({ isOpen, onClose, onSuccess }: JoinSheetProps) {
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
      setError('Event not found. Double-check your invite code.')
      return
    }
    onSuccess(data.id, data.name)
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
        <div className="px-4 pb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Join Event</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 pb-8 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Invite code</label>
            <input
              ref={inputRef}
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="ABC123"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || !inviteCode.trim()}
            className="w-full py-3 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {loading ? 'Looking up code…' : 'Join Event'}
          </button>
        </form>
      </div>
    </>
  )
}

// Keep VISITED_KEY re-exported for any consumers that imported it from here before
export { VISITED_KEY }
