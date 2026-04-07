import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type {
  Event,
  Participant,
  Decision,
  DecisionOption,
  Vote,
  Assignment,
  TaskCategory,
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
  decisionsError: string | null
  currentParticipantId: string | null

  // ── Tasks state ───────────────────────────────────────────────────────────
  tasksLoading: boolean
  tasksError: string | null

  // ── Expenses state ────────────────────────────────────────────────────────
  expensesLoading: boolean
  expensesError: string | null

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
  ) => Promise<boolean>
  deleteDecision: (decisionId: string) => Promise<void>
  castVote: (optionId: string, decisionId: string) => Promise<void>
  lockDecision: (decisionId: string) => Promise<void>
  reopenDecision: (decisionId: string) => Promise<void>
  setCurrentParticipant: (id: string | null) => void

  // ── Task actions ──────────────────────────────────────────────────────────
  createAssignment: (
    eventId: string,
    item: string,
    category: TaskCategory | null,
    assignedTo: string | null
  ) => Promise<boolean>
  assignTask: (assignmentId: string, participantId: string) => Promise<void>
  unassignTask: (assignmentId: string) => Promise<void>
  deleteTask: (assignmentId: string) => Promise<void>
  updateAssignment: (id: string, item: string, category: TaskCategory | null) => Promise<boolean>

  // ── Expense actions ───────────────────────────────────────────────────────
  createExpense: (
    eventId: string,
    item: string,
    amount: number,
    paidBy: string
  ) => Promise<boolean>
  deleteExpense: (expenseId: string) => Promise<void>
  updateExpense: (id: string, item: string, amount: number, paidBy: string) => Promise<boolean>

  // ── Decision edit actions ─────────────────────────────────────────────────
  updateDecisionQuestion: (decisionId: string, question: string) => Promise<void>
  addDecisionOption: (decisionId: string, label: string) => Promise<boolean>

  // ── Participant actions ───────────────────────────────────────────────────
  addParticipant: (eventId: string, name: string) => Promise<void>

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
  decisionsError: null,
  tasksLoading: false,
  tasksError: null,
  expensesLoading: false,
  expensesError: null,
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
    set({ tasksLoading: true, tasksError: null })
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    if (error) set({ tasksError: 'fetch_failed' })
    else if (data) set({ assignments: data })
    set({ tasksLoading: false })
  },

  fetchExpenses: async (eventId) => {
    set({ expensesLoading: true, expensesError: null })
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    if (error) set({ expensesError: 'fetch_failed' })
    else if (data) set({ expenses: data })
    set({ expensesLoading: false })
  },

  // ── Decisions: fetch ──────────────────────────────────────────────────────

  fetchDecisions: async (eventId) => {
    set({ decisionsLoading: true, decisionsError: null })

    const { data: decisions, error } = await supabase
      .from('decisions')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (error || !decisions) {
      set({ decisionsLoading: false, decisionsError: 'fetch_failed' })
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
      return false
    }

    const optionsPayload = optionTitles.map((t) => ({ decision_id: decision.id, label: t }))
    const { error: optionsError } = await supabase
      .from('decision_options')
      .insert(optionsPayload)

    if (optionsError) {
      console.error('[createDecision] options insert failed:', optionsError)
      return false
    }

    // Full re-fetch to populate options + votes in one pass
    await get().fetchDecisions(eventId)
    return true
  },

  deleteDecision: async (decisionId) => {
    const { error } = await supabase.from('decisions').delete().eq('id', decisionId)
    if (error) return
    set((state) => {
      const removedOptionIds = new Set(
        state.decisionOptions.filter((o) => o.decision_id === decisionId).map((o) => o.id)
      )
      return {
        decisions: state.decisions.filter((d) => d.id !== decisionId),
        decisionOptions: state.decisionOptions.filter((o) => o.decision_id !== decisionId),
        decisionVotes: state.decisionVotes.filter((v) => !removedOptionIds.has(v.decision_option_id)),
      }
    })
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

  // ── Participants ──────────────────────────────────────────────────────────

  addParticipant: async (eventId, name) => {
    const { data, error } = await supabase
      .from('participants')
      .insert({ event_id: eventId, name })
      .select()
      .single()
    if (error || !data) {
      console.error('[addParticipant] insert failed:', error)
      return
    }
    set((state) => ({ participants: [...state.participants, data] }))
  },

  // ── Task actions ──────────────────────────────────────────────────────────

  createAssignment: async (eventId, item, category, assignedTo) => {
    const { data, error } = await supabase
      .from('assignments')
      .insert({
        event_id: eventId,
        item,
        category,
        assigned_to: assignedTo,
        status: 'todo',
      })
      .select()
      .single()
    if (error || !data) {
      console.error('[createAssignment] insert failed:', error)
      return false
    }
    set((state) => ({ assignments: [data, ...state.assignments] }))
    return true
  },

  assignTask: async (assignmentId, participantId) => {
    const { error } = await supabase
      .from('assignments')
      .update({ assigned_to: participantId })
      .eq('id', assignmentId)
    if (error) return
    set((state) => ({
      assignments: state.assignments.map((a) =>
        a.id === assignmentId ? { ...a, assigned_to: participantId } : a
      ),
    }))
  },

  unassignTask: async (assignmentId) => {
    const { error } = await supabase
      .from('assignments')
      .update({ assigned_to: null })
      .eq('id', assignmentId)
    if (error) return
    set((state) => ({
      assignments: state.assignments.map((a) =>
        a.id === assignmentId ? { ...a, assigned_to: null } : a
      ),
    }))
  },

  deleteTask: async (assignmentId) => {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId)
    if (error) return
    set((state) => ({
      assignments: state.assignments.filter((a) => a.id !== assignmentId),
    }))
  },

  updateAssignment: async (id, item, category) => {
    const { error } = await supabase
      .from('assignments')
      .update({ item, category })
      .eq('id', id)
    if (error) {
      console.error('[updateAssignment] failed:', error)
      return false
    }
    set((state) => ({
      assignments: state.assignments.map((a) =>
        a.id === id ? { ...a, item, category } : a
      ),
    }))
    return true
  },

  // ── Expense actions ───────────────────────────────────────────────────────

  createExpense: async (eventId, item, amount, paidBy) => {
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        event_id: eventId,
        item,
        amount,
        paid_by: paidBy,
      })
      .select()
      .single()
    if (error || !data) {
      console.error('[createExpense] insert failed:', error)
      return false
    }
    set((state) => ({ expenses: [data, ...state.expenses] }))
    return true
  },

  deleteExpense: async (expenseId) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)
    if (error) return
    set((state) => ({ expenses: state.expenses.filter((e) => e.id !== expenseId) }))
  },

  updateExpense: async (id, item, amount, paidBy) => {
    const { error } = await supabase
      .from('expenses')
      .update({ item, amount, paid_by: paidBy })
      .eq('id', id)
    if (error) {
      console.error('[updateExpense] failed:', error)
      return false
    }
    set((state) => ({
      expenses: state.expenses.map((e) =>
        e.id === id ? { ...e, item, amount, paid_by: paidBy } : e
      ),
    }))
    return true
  },

  updateDecisionQuestion: async (decisionId, question) => {
    const { error } = await supabase
      .from('decisions')
      .update({ question })
      .eq('id', decisionId)
    if (error) {
      console.error('[updateDecisionQuestion] failed:', error)
      return
    }
    set((state) => ({
      decisions: state.decisions.map((d) =>
        d.id === decisionId ? { ...d, question } : d
      ),
    }))
  },

  addDecisionOption: async (decisionId, label) => {
    const { data, error } = await supabase
      .from('decision_options')
      .insert({ decision_id: decisionId, label })
      .select()
      .single()
    if (error || !data) {
      console.error('[addDecisionOption] failed:', error)
      return false
    }
    set((state) => ({ decisionOptions: [...state.decisionOptions, data] }))
    return true
  },

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
