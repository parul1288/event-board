export interface Event {
  id: string
  name: string
  description: string | null
  invite_code: string
  date: string | null
  location: string | null
  guest_count: number | null
  created_at: string
}

export interface Participant {
  id: string
  event_id: string
  name: string
  email: string | null
  created_at: string
}

export interface Decision {
  id: string
  event_id: string
  title: string
  description: string | null
  status: 'open' | 'closed'
  created_at: string
}

export interface DecisionOption {
  id: string
  decision_id: string
  title: string
  votes_count: number
}

export interface Vote {
  id: string
  decision_option_id: string
  participant_id: string
  created_at: string
}

export interface Assignment {
  id: string
  event_id: string
  title: string
  description: string | null
  assigned_to: string | null
  status: 'todo' | 'in_progress' | 'done'
  due_date: string | null
  created_at: string
}

export interface Expense {
  id: string
  event_id: string
  title: string
  amount: number
  paid_by: string
  split_among: string[]
  created_at: string
}
