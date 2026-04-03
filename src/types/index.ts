export interface Event {
  id: string
  name: string
  description: string | null
  invite_code: string
  date: string | null
  location: string | null
  guest_count: number | null
  created_by: string | null
  created_by_auth_id: string | null
  created_at: string
}

export interface Participant {
  id: string
  event_id: string
  name: string
  email: string | null
  auth_user_id: string | null
  is_active: boolean | null
  created_at: string
}

export interface Decision {
  id: string
  event_id: string
  question: string
  is_locked: boolean
  allow_multiple_votes: boolean
  created_at: string
}

export interface DecisionOption {
  id: string
  decision_id: string
  label: string
}

export interface Vote {
  id: string
  decision_option_id: string
  participant_id: string
  created_at: string
}

export type TaskCategory = 'Food' | 'Decor' | 'Supplies' | 'Logistics' | 'Other'

export interface Assignment {
  id: string
  event_id: string
  item: string
  category: TaskCategory | null
  description: string | null
  assigned_to: string | null
  status: 'todo' | 'in_progress' | 'done'
  due_date: string | null
  created_at: string
}

export interface Expense {
  id: string
  event_id: string
  item: string
  amount: number
  paid_by: string
  created_at: string
}
