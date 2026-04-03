import { useEffect, useState, useRef, KeyboardEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useEventStore } from '../store/eventStore'
import { supabase } from '../lib/supabase'
import { participantKey, creatorKey } from '../lib/storage'
import Layout from '../components/Layout'
import WhoAreYouModal from '../components/WhoAreYouModal'
import type { Decision, DecisionOption } from '../types'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DecisionsPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const {
    currentEvent,
    decisions,
    decisionOptions,
    decisionVotes,
    participants,
    decisionsLoading,
    decisionsError,
    currentParticipantId,
    fetchEvent,
    fetchDecisions,
    fetchParticipants,
    setCurrentParticipant,
  } = useEventStore()

  // Creator detection: check localStorage key first, then fall back to currentEvent.created_by
  const storedCreatorId = eventId ? localStorage.getItem(creatorKey(eventId)) : null
  const isCreator =
    !!currentParticipantId &&
    !!(storedCreatorId === currentParticipantId || currentEvent?.created_by === currentParticipantId)

  // Persist creator status to localStorage whenever we can confirm it via the event record
  useEffect(() => {
    if (!eventId || !currentParticipantId || !currentEvent?.created_by) return
    if (currentEvent.created_by === currentParticipantId) {
      localStorage.setItem(creatorKey(eventId), currentParticipantId)
    }
  }, [currentEvent?.created_by, currentParticipantId, eventId])

  const [showNewDecision, setShowNewDecision] = useState(false)
  const [showWhoAreYou, setShowWhoAreYou] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Track previous count to auto-expand newly created decision
  const prevLengthRef = useRef(0)
  useEffect(() => {
    if (decisions.length > prevLengthRef.current && decisions.length > 0) {
      setExpandedId(decisions[0].id) // newest is first (created_at desc)
    }
    prevLengthRef.current = decisions.length
  }, [decisions.length])

  // Restore identity from localStorage and fetch data on mount
  useEffect(() => {
    if (!eventId) return
    const stored = localStorage.getItem(participantKey(eventId))
    if (stored) setCurrentParticipant(stored)
    fetchEvent(eventId)
    fetchDecisions(eventId)
    fetchParticipants(eventId)
  }, [eventId])

  const currentParticipant = participants.find((p) => p.id === currentParticipantId)

  const handleVoteAttempt = () => {
    if (!currentParticipantId) setShowWhoAreYou(true)
  }

  const handleSelectParticipant = (participantId: string) => {
    if (!eventId) return
    localStorage.setItem(participantKey(eventId), participantId)
    setCurrentParticipant(participantId)
    // Persist creator status if this participant is the event creator
    if (currentEvent?.created_by === participantId) {
      localStorage.setItem(creatorKey(eventId), participantId)
    }
    setShowWhoAreYou(false)
  }

  const handleAddParticipant = async (name: string) => {
    if (!eventId) return
    const { data, error } = await supabase
      .from('participants')
      .insert({ event_id: eventId, name })
      .select()
      .single()
    if (error || !data) return
    await fetchParticipants(eventId)
    handleSelectParticipant(data.id)
  }

  const open = decisions.filter((d) => !d.is_locked)
  const decided = decisions.filter((d) => d.is_locked)

  const handleToggle = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id))

  return (
    <Layout>
      <div className="p-4 pb-6 space-y-4">
        {/* Identity strip */}
        {currentParticipant ? (
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-accent-100 text-accent-700 text-xs font-bold flex items-center justify-center shrink-0">
                {currentParticipant.name[0].toUpperCase()}
              </span>
              <span className="text-sm text-gray-600">
                Voting as{' '}
                <span className="font-semibold text-gray-900">{currentParticipant.name}</span>
              </span>
            </div>
            <button
              onClick={() => {
                if (eventId) localStorage.removeItem(participantKey(eventId))
                setCurrentParticipant(null)
              }}
              className="text-xs text-gray-400 hover:text-gray-500 transition-colors"
            >
              not you?
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowWhoAreYou(true)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-left"
          >
            <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-800">Who are you?</p>
              <p className="text-xs text-amber-600">Tap to identify yourself and vote</p>
            </div>
            <svg className="w-4 h-4 text-amber-400 shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Fetch error */}
        {decisionsError && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Something went wrong. Pull down to refresh.
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Decisions</h1>
          <button
            onClick={() => setShowNewDecision(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-accent-600 hover:text-accent-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Decision
          </button>
        </div>

        {/* Loading skeletons */}
        {decisionsLoading && (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5 flex-1 pr-4">
                    <div className="h-4 w-3/4 bg-gray-100 rounded" />
                    <div className="h-3 w-16 bg-gray-100 rounded" />
                  </div>
                  <div className="h-5 w-12 bg-gray-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!decisionsLoading && decisions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6m-6 4h6" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">No decisions yet</p>
            <p className="text-xs text-gray-500 mb-5 max-w-xs">
              Create a decision to get the group's input.
            </p>
            <button
              onClick={() => setShowNewDecision(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent-600 hover:bg-accent-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Decision
            </button>
          </div>
        )}

        {/* Open decisions */}
        {!decisionsLoading && open.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Open · {open.length}
            </h2>
            <div className="space-y-2">
              {open.map((d) => (
                <DecisionCard
                  key={d.id}
                  decision={d}
                  options={decisionOptions.filter((o) => o.decision_id === d.id)}
                  allVotes={decisionVotes}
                  currentParticipantId={currentParticipantId}
                  participantCount={participants.length}
                  isExpanded={expandedId === d.id}
                  onToggle={() => handleToggle(d.id)}
                  onVoteAttempt={handleVoteAttempt}
                  isCreator={isCreator}
                />
              ))}
            </div>
          </section>
        )}

        {/* Decided */}
        {!decisionsLoading && decided.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Decided · {decided.length}
            </h2>
            <div className="space-y-2">
              {decided.map((d) => (
                <DecisionCard
                  key={d.id}
                  decision={d}
                  options={decisionOptions.filter((o) => o.decision_id === d.id)}
                  allVotes={decisionVotes}
                  currentParticipantId={currentParticipantId}
                  participantCount={participants.length}
                  isExpanded={expandedId === d.id}
                  onToggle={() => handleToggle(d.id)}
                  onVoteAttempt={handleVoteAttempt}
                  isCreator={isCreator}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Modals */}
      {eventId && (
        <NewDecisionModal
          isOpen={showNewDecision}
          onClose={() => setShowNewDecision(false)}
          eventId={eventId}
        />
      )}

      <WhoAreYouModal
        isOpen={showWhoAreYou}
        onClose={() => setShowWhoAreYou(false)}
        participants={participants}
        onSelect={handleSelectParticipant}
        onAdd={handleAddParticipant}
      />
    </Layout>
  )
}

// ─── Decision card ────────────────────────────────────────────────────────────

interface DecisionCardProps {
  decision: Decision
  options: DecisionOption[]
  allVotes: ReturnType<typeof useEventStore>['decisionVotes']
  currentParticipantId: string | null
  participantCount: number
  isExpanded: boolean
  onToggle: () => void
  onVoteAttempt: () => void
  isCreator: boolean
}

function DecisionCard({
  decision,
  options,
  allVotes,
  currentParticipantId,
  participantCount,
  isExpanded,
  onToggle,
  onVoteAttempt,
  isCreator,
}: DecisionCardProps) {
  const { castVote, lockDecision, reopenDecision, deleteDecision } = useEventStore()
  const [votingOptionId, setVotingOptionId] = useState<string | null>(null)
  const [locking, setLocking] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isLocked = decision.is_locked
  const votesForDecision = allVotes.filter((v) =>
    options.some((o) => o.id === v.decision_option_id)
  )
  const totalVotes = votesForDecision.length
  const myVotedOptionIds = new Set(
    votesForDecision
      .filter((v) => v.participant_id === currentParticipantId)
      .map((v) => v.decision_option_id)
  )
  const uniqueVoterCount = new Set(votesForDecision.map((v) => v.participant_id)).size

  // For decided cards: find the winning option(s)
  const voteCountForOption = (optionId: string) =>
    votesForDecision.filter((v) => v.decision_option_id === optionId).length
  const maxVotes = options.length > 0 ? Math.max(...options.map((o) => voteCountForOption(o.id))) : 0
  const isWinner = (optionId: string) => isLocked && maxVotes > 0 && voteCountForOption(optionId) === maxVotes

  const handleVote = async (optionId: string) => {
    if (isLocked) return
    if (!currentParticipantId) {
      onVoteAttempt()
      return
    }
    setVotingOptionId(optionId)
    await castVote(optionId, decision.id)
    setVotingOptionId(null)
  }

  const handleLock = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLocking(true)
    await lockDecision(decision.id)
    setLocking(false)
  }

  const handleReopen = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLocking(true)
    await reopenDecision(decision.id)
    setLocking(false)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDelete(true)
  }

  const handleDeleteConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleting(true)
    await deleteDecision(decision.id)
    setDeleting(false)
  }

  const handleDeleteCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDelete(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Collapsed header — always visible, tappable */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3.5 flex items-center gap-3"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-snug">{decision.question}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          </p>
        </div>

        {/* Status badge */}
        {isLocked ? (
          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Decided
          </span>
        ) : (
          <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-accent-100 text-accent-700">
            Open
          </span>
        )}

        {/* Delete button (creator only) */}
        {isCreator && !confirmDelete && (
          <button
            onClick={handleDeleteClick}
            className="shrink-0 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
            aria-label="Delete decision"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Delete confirmation row */}
      {confirmDelete && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-100 flex items-center justify-between gap-3">
          <p className="text-sm text-red-700 font-medium">Delete this decision?</p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDeleteCancel}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Expanded body */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          {/* Options */}
          <div className="space-y-2.5">
            {options.map((option) => {
              const voteCount = voteCountForOption(option.id)
              const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0
              const iVoted = myVotedOptionIds.has(option.id)
              const isVotingThis = votingOptionId === option.id
              const winner = isWinner(option.id)

              if (isLocked) {
                // Read-only view for decided cards
                return (
                  <div
                    key={option.id}
                    className={`rounded-xl border p-3 ${
                      winner
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-100 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {winner && (
                          <span className="shrink-0 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                        <span className={`text-sm truncate ${winner ? 'font-bold text-green-900' : 'text-gray-500'}`}>
                          {option.label}
                        </span>
                      </div>
                      <span className={`shrink-0 ml-3 text-xs font-medium ${winner ? 'text-green-700' : 'text-gray-400'}`}>
                        {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${winner ? 'bg-green-500' : 'bg-gray-300'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {totalVotes > 0 && (
                      <p className={`text-[11px] mt-1 ${winner ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                        {pct}%
                      </p>
                    )}
                  </div>
                )
              }

              // Interactive view for open cards
              return (
                <button
                  key={option.id}
                  onClick={() => handleVote(option.id)}
                  disabled={!!votingOptionId}
                  className={`w-full text-left rounded-xl border p-3 transition-all ${
                    iVoted
                      ? 'border-accent-400 bg-accent-50'
                      : 'border-gray-200 hover:border-accent-300 hover:bg-gray-50 active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Selection indicator */}
                      <span
                        className={`shrink-0 flex items-center justify-center transition-colors ${
                          decision.allow_multiple_votes
                            ? `w-4 h-4 rounded border-2 ${iVoted ? 'border-accent-600 bg-accent-600' : 'border-gray-300'}`
                            : `w-4 h-4 rounded-full border-2 ${iVoted ? 'border-accent-600' : 'border-gray-300'}`
                        }`}
                      >
                        {decision.allow_multiple_votes && iVoted && (
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {!decision.allow_multiple_votes && iVoted && (
                          <span className="w-2 h-2 rounded-full bg-accent-600" />
                        )}
                      </span>
                      <span className={`text-sm truncate ${iVoted ? 'font-semibold text-accent-900' : 'text-gray-800'}`}>
                        {option.label}
                      </span>
                      {isVotingThis && (
                        <span className="shrink-0 w-3.5 h-3.5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                    <span className="shrink-0 ml-3 text-xs font-medium text-gray-500">
                      {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                    </span>
                  </div>

                  {/* Vote bar */}
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${iVoted ? 'bg-accent-500' : 'bg-gray-300'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {totalVotes > 0 && (
                    <p className="text-[11px] text-gray-400 mt-1">{pct}%</p>
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {uniqueVoterCount} of {participantCount || '?'} voted
              {!isLocked && decision.allow_multiple_votes && (
                <span className="ml-2 text-gray-300">· multiple choices ok</span>
              )}
            </p>

            {isLocked ? (
              <button
                onClick={handleReopen}
                disabled={locking}
                className="text-xs font-medium text-gray-400 hover:text-gray-700 disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                {locking ? (
                  <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                )}
                Reopen
              </button>
            ) : (
              <button
                onClick={handleLock}
                disabled={locking}
                className="text-xs font-medium text-gray-500 hover:text-gray-800 disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                {locking ? (
                  <span className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
                Lock decision
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── New Decision modal (full-screen) ─────────────────────────────────────────

interface NewDecisionModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
}

function NewDecisionModal({ isOpen, onClose, eventId }: NewDecisionModalProps) {
  const { createDecision } = useEventStore()

  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const questionRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => questionRef.current?.focus(), 300)
    } else {
      setQuestion('')
      setOptions(['', ''])
      setAllowMultiple(false)
      setError(null)
    }
  }, [isOpen])

  const addOption = () => {
    if (options.length < 6) setOptions([...options, ''])
  }

  const removeOption = (i: number) => {
    if (options.length <= 2) return
    setOptions(options.filter((_, idx) => idx !== i))
  }

  const updateOption = (i: number, val: string) =>
    setOptions(options.map((o, idx) => (idx === i ? val : o)))

  const handleOptionKeyDown = (e: KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (i < options.length - 1) {
        const inputs = document.querySelectorAll<HTMLInputElement>('[data-option-input]')
        inputs[i + 1]?.focus()
      } else if (options.length < 6) {
        addOption()
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = question.trim()
    const validOptions = options.map((o) => o.trim()).filter(Boolean)
    if (!q) return setError('Enter a question.')
    if (validOptions.length < 2) return setError('Add at least 2 options.')

    setSubmitting(true)
    setError(null)
    const ok = await createDecision(eventId, q, allowMultiple, validOptions)
    setSubmitting(false)
    if (!ok) {
      setError("Couldn't save. Please try again.")
      return
    }
    onClose()
  }

  return (
    <div
      className={`fixed inset-0 bg-white z-50 flex flex-col transition-transform duration-300 ease-out ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 shrink-0">
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-base font-semibold text-gray-900">New Decision</h2>
      </header>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-28 space-y-5">
        {/* Question */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Question <span className="text-accent-500">*</span>
          </label>
          <input
            ref={questionRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Where should we meet?"
            className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
          />
        </div>

        {/* Options */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Options <span className="text-gray-400 font-normal normal-case">(min 2, max 6)</span>
          </label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-400">
                  {i + 1}
                </span>
                <input
                  data-option-input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  onKeyDown={(e) => handleOptionKeyDown(e, i)}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {options.length < 6 && (
            <button
              type="button"
              onClick={addOption}
              className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-accent-600 hover:text-accent-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add option
            </button>
          )}
        </div>

        {/* Allow multiple toggle */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3.5 border border-gray-200">
          <div>
            <p className="text-sm font-medium text-gray-800">Allow multiple votes</p>
            <p className="text-xs text-gray-500 mt-0.5">Let people pick more than one option</p>
          </div>
          <button
            type="button"
            onClick={() => setAllowMultiple(!allowMultiple)}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
              allowMultiple ? 'bg-accent-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                allowMultiple ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-500 px-1">{error}</p>
        )}
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-0 inset-x-0 px-4 py-4 bg-white border-t border-gray-200">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3.5 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Add Decision
            </>
          )}
        </button>
      </div>
    </div>
  )
}
