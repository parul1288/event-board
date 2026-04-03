import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useEventStore } from '../store/eventStore'
import Layout from '../components/Layout'

// Deterministic color per avatar index
const AVATAR_COLORS = [
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-blue-100',   text: 'text-blue-700' },
  { bg: 'bg-green-100',  text: 'text-green-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-pink-100',   text: 'text-pink-700' },
  { bg: 'bg-teal-100',   text: 'text-teal-700' },
  { bg: 'bg-amber-100',  text: 'text-amber-700' },
  { bg: 'bg-rose-100',   text: 'text-rose-700' },
]

function avatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ParticipantsPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const {
    participants,
    assignments,
    decisionVotes,
    fetchParticipants,
    fetchAssignments,
    fetchDecisions,
  } = useEventStore()

  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId) return
    Promise.all([
      fetchParticipants(eventId),
      fetchAssignments(eventId),
      fetchDecisions(eventId),
    ]).finally(() => setLoading(false))
  }, [eventId])

  // Sort ascending by created_at so the first entry is the creator
  const sorted = [...participants].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const creatorId = sorted[0]?.id ?? null

  return (
    <Layout>
      <div className="p-4 pb-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">
            Participants
            {!loading && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                {participants.length} {participants.length === 1 ? 'person' : 'people'}
              </span>
            )}
          </h1>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-accent-600 hover:text-accent-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Participant
          </button>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-28 bg-gray-100 rounded" />
                  <div className="h-3 w-40 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && participants.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-5">No participants yet</p>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent-600 hover:bg-accent-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Add First Participant
            </button>
          </div>
        )}

        {/* Participant cards */}
        {!loading && participants.length > 0 && (
          <div className="space-y-2">
            {sorted.map((p, idx) => {
              const taskCount = assignments.filter((a) => a.assigned_to === p.id).length
              const voteCount = decisionVotes.filter((v) => v.participant_id === p.id).length
              const color = avatarColor(idx)
              const isCreator = p.id === creatorId

              return (
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                  {/* Avatar */}
                  <span
                    className={`w-10 h-10 rounded-full ${color.bg} ${color.text} text-sm font-bold flex items-center justify-center shrink-0`}
                  >
                    {p.name[0].toUpperCase()}
                  </span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900 truncate">{p.name}</span>
                      {isCreator && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent-100 text-accent-700 shrink-0">
                          Creator
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {taskCount} task{taskCount !== 1 ? 's' : ''} · {voteCount} vote{voteCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Participant modal */}
      {eventId && (
        <AddParticipantModal
          isOpen={showAdd}
          onClose={() => setShowAdd(false)}
          eventId={eventId}
        />
      )}
    </Layout>
  )
}

// ─── Add Participant modal (bottom sheet) ──────────────────────────────────────

interface AddParticipantModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
}

function AddParticipantModal({ isOpen, onClose, eventId }: AddParticipantModalProps) {
  const { addParticipant } = useEventStore()
  const inputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    } else {
      setName('')
      setError(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return setError('Enter a name.')
    setSubmitting(true)
    setError(null)
    await addParticipant(eventId, n)
    setSubmitting(false)
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
          <h2 className="text-base font-semibold text-gray-900">Add Participant</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 pb-8 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Name <span className="text-accent-500">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Riya"
              className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            />
          </div>

          {error && <p className="text-sm text-red-500 px-1">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Adding…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Participant
              </>
            )}
          </button>
        </form>
      </div>
    </>
  )
}
