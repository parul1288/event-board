import { useEffect, useState } from 'react'
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
    currentEvent,
    participants,
    assignments,
    decisionVotes,
    fetchEvent,
    fetchParticipants,
    fetchAssignments,
    fetchDecisions,
  } = useEventStore()

  const [loading, setLoading] = useState(true)
  const [codeCopied, setCodeCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (!eventId) return
    Promise.all([
      fetchEvent(eventId),
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

  const inviteCode = currentEvent?.invite_code ?? ''
  const inviteLink = `${window.location.origin}/event/${eventId}`

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch {}
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    } catch {}
  }

  return (
    <Layout>
      <div className="p-4 pb-6 space-y-4">

        {/* ── Invite section ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Invite people</h2>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-600 hover:bg-accent-700 active:bg-accent-800 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {linkCopied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Copy invite link
                </>
              )}
            </button>
          </div>

          <div className="px-4 py-3 space-y-3">
            {/* Invite code row */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">Invite code</p>
                <p className="text-base font-bold text-gray-900 font-mono tracking-widest">
                  {inviteCode || '—'}
                </p>
              </div>
              <button
                onClick={copyCode}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  codeCopied
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}
              >
                {codeCopied ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>

            {/* Full link */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 truncate flex-1 font-mono">{inviteLink}</p>
            </div>
          </div>

          {/* Note */}
          <div className="px-4 pb-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              People join by clicking the invite link and signing in with Google.
            </p>
          </div>
        </div>

        {/* ── Participants header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">
            Participants
            {!loading && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                {participants.length} {participants.length === 1 ? 'person' : 'people'}
              </span>
            )}
          </h1>
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
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">No participants yet</p>
            <p className="text-xs text-gray-400">Share the invite link above to get people to join.</p>
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

        {/* Link copied toast */}
        <div
          className={`fixed bottom-24 inset-x-4 flex items-center gap-3 px-4 py-3 bg-gray-900 text-white rounded-xl shadow-lg transition-all duration-300 z-50 ${
            linkCopied ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm font-medium">Link copied! Share it to invite people.</p>
        </div>
      </div>
    </Layout>
  )
}
