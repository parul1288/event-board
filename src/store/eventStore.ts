import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Event, Participant, Decision, Assignment, Expense } from '../types'

interface EventStore {
  currentEvent: Event | null
  participants: Participant[]
  decisions: Decision[]
  assignments: Assignment[]
  expenses: Expense[]
  loading: boolean
  error: string | null

  fetchEvent: (id: string) => Promise<void>
  fetchParticipants: (eventId: string) => Promise<void>
  fetchDecisions: (eventId: string) => Promise<void>
  fetchAssignments: (eventId: string) => Promise<void>
  fetchExpenses: (eventId: string) => Promise<void>
  clearEvent: () => void
}

export const useEventStore = create<EventStore>((set) => ({
  currentEvent: null,
  participants: [],
  decisions: [],
  assignments: [],
  expenses: [],
  loading: false,
  error: null,

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

  fetchDecisions: async (eventId) => {
    const { data, error } = await supabase
      .from('decisions')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    if (!error && data) set({ decisions: data })
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

  clearEvent: () =>
    set({
      currentEvent: null,
      participants: [],
      decisions: [],
      assignments: [],
      expenses: [],
      error: null,
    }),
}))
