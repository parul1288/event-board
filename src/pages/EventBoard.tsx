import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEventStore } from '../store/eventStore'
import { supabase } from '../lib/supabase'
import { participantKey, creatorKey } from '../lib/storage'
import Layout from '../components/Layout'
import WhoAreYouModal from '../components/WhoAreYouModal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

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

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventBoard() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    currentEvent,
    participants,
    decisions,
    decisionOptions,
    decisionVotes,
    assignments,
    expenses,
    currentParticipantId,
    fetchEvent,
    fetchParticipants,
    fetchDecisions,
    fetchAssignments,
    fetchExpenses,
    setCurrentParticipant,
  } = useEventStore()

  const [showDetails, setShowDetails] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showIdentity, setShowIdentity] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    // Restore identity from localStorage
    const stored = localStorage.getItem(participantKey(id))
    if (stored) setCurrentParticipant(stored)
    Promise.all([
      fetchEvent(id),
      fetchParticipants(id),
      fetchDecisions(id),
      fetchAssignments(id),
      fetchExpenses(id),
    ]).finally(() => {
      setLoading(false)
      // Show identity gate if visitor has no stored identity (e.g. joined via code)
      if (!stored) setShowIdentity(true)
    })
  }, [id])

  // Persist creator status whenever event data confirms it
  useEffect(() => {
    if (!id || !currentParticipantId || !currentEvent?.created_by) return
    if (currentEvent.created_by === currentParticipantId) {
      localStorage.setItem(creatorKey(id), currentParticipantId)
    }
  }, [currentEvent?.created_by, currentParticipantId, id])

  const handleSelectParticipant = (participantId: string) => {
    if (!id) return
    localStorage.setItem(participantKey(id), participantId)
    setCurrentParticipant(participantId)
    if (currentEvent?.created_by === participantId) {
      localStorage.setItem(creatorKey(id), participantId)
    }
    setShowIdentity(false)
  }

  const handleAddParticipant = async (name: string) => {
    if (!id) return
    const { data, error } = await supabase
      .from('participants')
      .insert({ event_id: id, name })
      .select()
      .single()
    if (error || !data) return
    await fetchParticipants(id)
    handleSelectParticipant(data.id)
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  const openDecisions = decisions.filter((d) => !d.is_locked).length
  const unassignedTasks = assignments.filter((a) => !a.assigned_to).length
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  const participantMap = Object.fromEntries(participants.map((p) => [p.id, p.name]))

  // ── Event details bar text ────────────────────────────────────────────────
  const detailsParts = [
    fmtDate(currentEvent?.date),
    currentEvent?.location ?? null,
  ].filter(Boolean)

  // ── Recent activity feed ──────────────────────────────────────────────────
  type ActivityItem = {
    id: string
    type: 'expense' | 'vote' | 'task' | 'decision'
    person: string | null
    subject: string
    amount?: string
    time: string
  }

  const activityItems: ActivityItem[] = []

  expenses.forEach((e) => {
    activityItems.push({
      id: `exp-${e.id}`,
      type: 'expense',
      person: participantMap[e.paid_by] ?? null,
      subject: e.item,
      amount: fmtCurrency(e.amount),
      time: e.created_at,
    })
  })

  decisionVotes.forEach((v) => {
    const option = decisionOptions.find((o) => o.id === v.decision_option_id)
    const decision = option ? decisions.find((d) => d.id === option.decision_id) : null
    if (!decision) return
    activityItems.push({
      id: `vote-${v.id}`,
      type: 'vote',
      person: participantMap[v.participant_id] ?? null,
      subject: decision.question,
      time: v.created_at,
    })
  })

  assignments
    .filter((a) => a.assigned_to)
    .forEach((a) => {
      activityItems.push({
        id: `task-${a.id}`,
        type: 'task',
        person: participantMap[a.assigned_to!] ?? null,
        subject: a.item,
        time: a.created_at,
      })
    })

  decisions.forEach((d) => {
    activityItems.push({
      id: `dec-${d.id}`,
      type: 'decision',
      person: null,
      subject: d.question,
      time: d.created_at,
    })
  })

  const recentActivity = activityItems
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5)

  return (
    <Layout>
      <div className="p-4 pb-6 space-y-4">
        {/* Event details bar */}
        {detailsParts.length > 0 && (
          <button
            onClick={() => setShowDetails(true)}
            className="w-full flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-gray-500 truncate">{detailsParts.join(' · ')}</span>
            </div>
            <svg className="w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* 2×2 stat tiles — skeleton while loading */}
        {loading ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                  <div className="h-3 w-16 bg-gray-100 rounded mb-3" />
                  <div className="h-7 w-10 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 h-32 animate-pulse" />
          </>
        ) : (
          <>
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="People"
            value={participants.length}
            onClick={() => navigate(`/event/${id}/participants`)}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
          <StatTile
            label="Open Decisions"
            value={openDecisions}
            onClick={() => navigate(`/event/${id}/decisions`)}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatTile
            label="Tasks Left"
            value={unassignedTasks}
            onClick={() => navigate(`/event/${id}/assignments`)}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatTile
            label="Total Spent"
            displayValue={fmtCurrency(totalExpenses)}
            onClick={() => navigate(`/event/${id}/expenses`)}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            }
          />
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Recent activity</h2>
          </div>
          <div className="px-4">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">
                Nothing yet. Start by adding a decision or task.
              </p>
            ) : (
              recentActivity.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))
            )}
          </div>
        </div>
          </>
        )}
      </div>

      {/* ── Identity gate (shown after joining when no stored participant) ───── */}
      <WhoAreYouModal
        isOpen={showIdentity}
        onClose={() => setShowIdentity(false)}
        participants={participants}
        onSelect={handleSelectParticipant}
        onAdd={handleAddParticipant}
        required
        subtitle="Select your name to get started with this event"
      />

      {/* ── Local event details modal (triggered by details bar) ─────────────── */}
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
          <DetailRow label="Date" value={fmtDateLong(currentEvent?.date)} />
          <DetailRow label="Location" value={currentEvent?.location} />
          <DetailRow label="Expected guests" value={currentEvent?.guest_count ? String(currentEvent.guest_count) : null} />
          <DetailRow label="Invite code" value={currentEvent?.invite_code} mono />
        </div>
      </div>
    </Layout>
  )
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

interface StatTileProps {
  label: string
  value?: number
  displayValue?: string
  onClick: () => void
  icon: React.ReactNode
}

function StatTile({ label, value, displayValue, onClick, icon }: StatTileProps) {
  const shown = displayValue ?? String(value ?? 0)
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-accent-300 hover:bg-accent-50/30 active:scale-[0.97] transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
          {icon}
        </span>
        <svg className="w-3.5 h-3.5 text-gray-300 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-none">{shown}</p>
      <p className="text-xs text-gray-500 mt-1.5 font-medium">{label}</p>
    </button>
  )
}

// ─── Activity row ─────────────────────────────────────────────────────────────

function ActivityRow({
  item,
}: {
  item: {
    type: string
    person: string | null
    subject: string
    amount?: string
    time: string
  }
}) {
  let line = ''
  if (item.type === 'expense') {
    line = item.person
      ? `${item.person} added "${item.subject}" · ${item.amount}`
      : `Expense added: "${item.subject}" · ${item.amount}`
  } else if (item.type === 'vote') {
    line = item.person
      ? `${item.person} voted on "${item.subject}"`
      : `Someone voted on "${item.subject}"`
  } else if (item.type === 'task') {
    line = item.person
      ? `${item.person} claimed "${item.subject}"`
      : `"${item.subject}" was claimed`
  } else {
    line = `New decision: "${item.subject}"`
  }

  const icon = {
    expense: (
      <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    vote: (
      <svg className="w-3.5 h-3.5 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    task: (
      <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    decision: (
      <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
      </svg>
    ),
  }[item.type]

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 leading-snug">{line}</p>
        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(item.time)}</p>
      </div>
    </div>
  )
}

// ─── Detail row helper ────────────────────────────────────────────────────────

function fmtDateLong(dateStr: string | null | undefined): string | null {
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

function DetailRow({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-400 w-28 shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-gray-900 ${mono ? 'font-mono tracking-wider' : ''}`}>{value}</span>
    </div>
  )
}
