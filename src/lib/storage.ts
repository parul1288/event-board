// ─── Keys ─────────────────────────────────────────────────────────────────────

export const VISITED_KEY = 'eb_visited_events'
export const NAME_KEY = 'eb_user_name'
export const participantKey = (eventId: string) => `eb_participant_${eventId}`
export const creatorKey = (eventId: string) => `eb_creator_${eventId}`

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VisitedEvent {
  id: string
  name: string
  role: 'creator' | 'member'
  visitedAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function readVisited(): VisitedEvent[] {
  try {
    return JSON.parse(localStorage.getItem(VISITED_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function upsertVisited(event: VisitedEvent) {
  const all = readVisited().filter((e) => e.id !== event.id)
  localStorage.setItem(VISITED_KEY, JSON.stringify([event, ...all]))
}
