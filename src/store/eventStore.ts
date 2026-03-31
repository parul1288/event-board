import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type {
  Event,
  Participant,
  Decision,
  DecisionOption,
  Vote,
  Assignment,
  Expense,
} from '../types'

interface EventStore {
  // ── Core event state ──────────────────────────────────────────────────────
  currentEvent: Event | null
  participants: Participant[]
  assignments: Assignment[]
  expenses: Expense[]
  loading: boolean
  error: string | null

  // ── Decisions state ───────────────────────────────────────────────────────
  decisions: Decision[]
  decisionOptions: DecisionOption[]
  decisionVotes: Vote[]
  decisionsLoading: boolean
  currentParticipantId: string | null

  // ── Core event actions ────────────────────────────────────────────────────
  fetchEvent: (id: string) => Promise<void>
  fetchParticipants: (eventId: string) => Promise<void>
  fetchAssignments: (eventId: string) => Promise<void>
  fetchExpenses: (eventId: string) => Promise<void>

  // ── Decision actions ──────────────────────────────────────────────────────
  fetchDecisions: (eventId: string) => Promise<void>
  createDecision: (
    eventId: string,
    title: string,
    allowMultiple: boolean,
    optionTitles: string[]
  ) => Promise<void>
  castVote: (optionId: string, decisionId: string) => Promise<void>
  lockDecision: (decisionId: string) => Promise<void>
  reopenDecision: (decisionId: string) => Promise<void>
  setCurrentParticipant: (id: string | null) => void

  clearEvent: () => void
}

export const useEventStore = create<EventStore>((set, get) => ({
  // ── Initial state ─────────────────────────────────────────────────────────
  currentEvent: null,
  participants: [],
  decisions: [],
  decisionOptions: [],
  decisionVotes: [],
  assignments: [],
  expenses: [],
  loading: false,
  decisionsLoading: false,
  error: null,
  currentParticipantId: null,

  // ── Core fetches ──────────────────────────────────────────────────────────

  fetchEvent: async (id) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()
    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ currentEvent: data, loading: false })
    }
  },

  fetchParticipants: async (eventId) => {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at')
    if (!error && data) set({ participants: data })
  },

  fetchAssignments: async (eventId) => {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    if (!error && data) set({ assignments: data })
  },

  fetchExpenses: async (eventId) => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    if (!error && data) set({ expenses: data })
  },

  // ── Decisions: fetch ──────────────────────────────────────────────────────

  fetchDecisions: async (eventId) => {
    set({ decisionsLoading: true })

    const { data: decisions, error } = await supabase
      .from('decisions')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (error || !decisions) {
      set({ decisionsLoading: false })
      return
    }

    set({ decisions })

    if (decisions.length === 0) {
      set({ decisionOptions: [], decisionVotes: [], decisionsLoading: false })
      return
    }

    // Fetch options for all decisions
    const decisionIds = decisions.map((d) => d.id)
    const { data: options } = await supabase
      .from('decision_options')
      .select('*')
      .in('decision_id', decisionIds)

    const opts = options ?? []
    set({ decisionOptions: opts })

    if (opts.length === 0) {
      set({ decisionVotes: [], decisionsLoading: false })
      return
    }

    // Fetch votes for all options
    const optionIds = opts.map((o) => o.id)
    const { data: votes } = await supabase
      .from('votes')
      .select('*')
      .in('decision_option_id', optionIds)

    set({ decisionVotes: votes ?? [], decisionsLoading: false })
  },

  // ── Decisions: create ─────────────────────────────────────────────────────

  createDecision: async (eventId, title, allowMultiple, optionTitles) => {
    const insertPayload = {
      event_id: eventId,
      question: title,
      allow_multiple_votes: allowMultiple,
      is_locked: false,
    }
    console.log('[createDecision] inserting decision:', insertPayload)

    const { data: decision, error } = await supabase
      .from('decisions')
      .insert(insertPayload)
      .select()
      .single()

    if (error || !decision) {
      console.error('[createDecision] decision insert failed:', error)
      return
    }

    const optionsPayload = optionTitles.map((t) => ({ decision_id: decision.id, label: t }))
    console.log('[createDecision] inserting options:', optionsPayload)

    const { error: optionsError } = await supabase
      .from('decision_options')
      .insert(optionsPayload)

    if (optionsError) {
      console.error('[createDecision] options insert failed:', optionsError)
    }

    // Full re-fetch to populate options + votes in one pass
    await get().fetchDecisions(eventId)
  },

  // ── Decisions: vote ───────────────────────────────────────────────────────

  castVote: async (optionId, decisionId) => {
    const { currentParticipantId, decisionVotes, decisionOptions, participants, decisions } = get()
    if (!currentParticipantId) return

    const decision = decisions.find((d) => d.id === decisionId)
    if (!decision || decision.is_locked) return

    const optionsForDecision = decisionOptions.filter((o) => o.decision_id === decisionId)
    const optionIdsForDecision = optionsForDecision.map((o) => o.id)

    // Toggle off if already voted for this exact option
    const existingVote = decisionVotes.find(
      (v) => v.decision_option_id === optionId && v.participant_id === currentParticipantId
    )
    if (existingVote) {
      set({ decisionVotes: decisionVotes.filter((v) => v.id !== existingVote.id) })
      await supabase.from('votes').delete().eq('id', existingVote.id)
      return
    }

    // For single-choice: remove existing votes on any option in this decision
    let removedIds: string[] = []
    if (!decision.allow_multiple_votes) {
      const previous = decisionVotes.filter(
        (v) =>
          optionIdsForDecision.includes(v.decision_option_id) &&
          v.participant_id === currentParticipantId
      )
      removedIds = previous.map((v) => v.id)
      if (removedIds.length > 0) {
        await supabase.from('votes').delete().in('id', removedIds)
      }
    }

    const { data: newVote, error } = await supabase
      .from('votes')
      .insert({ decision_option_id: optionId, participant_id: currentParticipantId })
      .select()
      .single()

    if (error || !newVote) return

    const updatedVotes = [
      ...decisionVotes.filter((v) => !removedIds.includes(v.id)),
      newVote,
    ]
    set({ decisionVotes: updatedVotes })

    // Auto-lock when every participant has voted at least once
    const voterIds = new Set(
      updatedVotes
        .filter((v) => optionIdsForDecision.includes(v.decision_option_id))
        .map((v) => v.participant_id)
    )
    if (participants.length > 0 && voterIds.size >= participants.length) {
      await get().lockDecision(decisionId)
    }
  },

  // ── Decisions: lock / reopen ──────────────────────────────────────────────

  lockDecision: async (decisionId) => {
    await supabase.from('decisions').update({ is_locked: true }).eq('id', decisionId)
    set((state) => ({
      decisions: state.decisions.map((d) =>
        d.id === decisionId ? { ...d, is_locked: true } : d
      ),
    }))
  },

  reopenDecision: async (decisionId) => {
    await supabase.from('decisions').update({ is_locked: false }).eq('id', decisionId)
    set((state) => ({
      decisions: state.decisions.map((d) =>
        d.id === decisionId ? { ...d, is_locked: false } : d
      ),
    }))
  },

  setCurrentParticipant: (id) => set({ currentParticipantId: id }),

  // ── Clear ─────────────────────────────────────────────────────────────────

  clearEvent: () =>
    set({
      currentEvent: null,
      participants: [],
      decisions: [],
      decisionOptions: [],
      decisionVotes: [],
      assignments: [],
      expenses: [],
      error: null,
      currentParticipantId: null,
    }),
}))
