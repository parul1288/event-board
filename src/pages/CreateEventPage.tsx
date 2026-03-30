import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { upsertVisited, NAME_KEY, participantKey } from '../lib/storage'

export default function CreateEventPage() {
  const navigate = useNavigate()

  // About You
  const [creatorName, setCreatorName] = useState('')

  // Event details
  const [eventName, setEventName] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [guestCount, setGuestCount] = useState('')

  // Participants
  const [extraParticipants, setExtraParticipants] = useState<string[]>([])
  const [participantInput, setParticipantInput] = useState('')

  // Form state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ creatorName?: string; eventName?: string }>({})

  const creatorInputRef = useRef<HTMLInputElement>(null)

  // Pre-fill name if already stored
  useEffect(() => {
    const stored = localStorage.getItem(NAME_KEY)
    if (stored) setCreatorName(stored)
    creatorInputRef.current?.focus()
  }, [])

  const addParticipant = () => {
    const name = participantInput.trim()
    if (!name) return
    if (extraParticipants.includes(name)) {
      setParticipantInput('')
      return
    }
    setExtraParticipants((prev) => [...prev, name])
    setParticipantInput('')
  }

  const removeParticipant = (name: string) => {
    setExtraParticipants((prev) => prev.filter((p) => p !== name))
  }

  const handleParticipantKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addParticipant()
    }
  }

  const validate = () => {
    const errs: typeof fieldErrors = {}
    if (!creatorName.trim()) errs.creatorName = 'Your name is required.'
    if (!eventName.trim()) errs.eventName = 'Event name is required.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setError(null)

    // 1. Create the event
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name: eventName.trim(),
        invite_code: code,
        date: date || null,
        location: location.trim() || null,
        guest_count: guestCount ? parseInt(guestCount, 10) : null,
      })
      .select()
      .single()

    if (eventError || !event) {
      setError(eventError?.message ?? 'Failed to create event.')
      setLoading(false)
      return
    }

    // 2. Insert creator as first participant
    const { data: creator, error: creatorError } = await supabase
      .from('participants')
      .insert({ event_id: event.id, name: creatorName.trim() })
      .select()
      .single()

    if (creatorError || !creator) {
      setError('Event created but failed to add you as a participant.')
      setLoading(false)
      return
    }

    // 3. Insert any additional participants
    if (extraParticipants.length > 0) {
      await supabase.from('participants').insert(
        extraParticipants.map((name) => ({ event_id: event.id, name }))
      )
    }

    // 4. Persist to localStorage
    localStorage.setItem(participantKey(event.id), creator.id)
    localStorage.setItem(NAME_KEY, creatorName.trim())
    upsertVisited({
      id: event.id,
      name: eventName.trim(),
      role: 'creator',
      visitedAt: new Date().toISOString(),
    })

    setLoading(false)
    navigate(`/event/${event.id}`)
  }

  const creatorDisplayName = creatorName.trim()
  const canSubmit = creatorName.trim() && eventName.trim() && !loading

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 flex items-center gap-3">
        <Link
          to="/"
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <p className="text-xs text-accent-600 font-medium leading-none mb-0.5">Event Board</p>
          <h1 className="text-sm font-semibold text-gray-900 leading-none">Create Event</h1>
        </div>
      </header>

      {/* Scrollable form area */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pb-32">
        {/* ── About You ──────────────────────────────────── */}
        <Section title="About You">
          <Field
            label="Your name"
            required
            error={fieldErrors.creatorName}
          >
            <input
              ref={creatorInputRef}
              type="text"
              value={creatorName}
              onChange={(e) => {
                setCreatorName(e.target.value)
                if (fieldErrors.creatorName) setFieldErrors((f) => ({ ...f, creatorName: undefined }))
              }}
              placeholder="What's your name?"
              className={inputClass(!!fieldErrors.creatorName)}
            />
          </Field>
        </Section>

        {/* ── Event Details ───────────────────────────────── */}
        <Section title="Event Details">
          <Field label="Event name" required error={fieldErrors.eventName}>
            <input
              type="text"
              value={eventName}
              onChange={(e) => {
                setEventName(e.target.value)
                if (fieldErrors.eventName) setFieldErrors((f) => ({ ...f, eventName: undefined }))
              }}
              placeholder="Weekend camping trip"
              className={inputClass(!!fieldErrors.eventName)}
            />
          </Field>

          <Field label="Date" hint="optional">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass(false)}
            />
          </Field>

          <Field label="Location" hint="optional">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, venue, or address"
              className={inputClass(false)}
            />
          </Field>

          <Field label="Expected guests" hint="optional">
            <input
              type="number"
              min="1"
              max="9999"
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              placeholder="How many people?"
              className={inputClass(false)}
            />
          </Field>
        </Section>

        {/* ── Participants ─────────────────────────────────── */}
        <Section title="Participants" subtitle="Add people who'll be part of this event">
          {/* Pill list */}
          {(creatorDisplayName || extraParticipants.length > 0) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {/* Creator pill — permanent */}
              {creatorDisplayName && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-100 text-accent-800 text-sm font-medium rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-500 shrink-0" />
                  {creatorDisplayName}
                  <span className="text-xs text-accent-500 font-normal">(you)</span>
                </span>
              )}
              {/* Extra participant pills */}
              {extraParticipants.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-full"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => removeParticipant(name)}
                    className="text-gray-400 hover:text-gray-600 transition-colors ml-0.5 -mr-0.5"
                    aria-label={`Remove ${name}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add participant input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={participantInput}
              onChange={(e) => setParticipantInput(e.target.value)}
              onKeyDown={handleParticipantKeyDown}
              placeholder="Add a participant…"
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={addParticipant}
              disabled={!participantInput.trim()}
              className="px-4 py-2.5 text-sm font-semibold text-accent-600 border border-accent-200 hover:bg-accent-50 disabled:opacity-40 disabled:cursor-default rounded-xl transition-colors shrink-0"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Press Enter or tap Add. You can always add more people later.
          </p>
        </Section>

        {/* Global error */}
        {error && (
          <div className="mx-4 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </form>

      {/* Sticky footer */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-4 py-4 safe-bottom">
        <button
          type="submit"
          form="create-event-form"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="w-full py-3.5 bg-accent-600 hover:bg-accent-700 active:bg-accent-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Create Event
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="mt-5 mx-4">
      <div className="mb-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 px-4 py-4 space-y-4">
        {children}
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-accent-500">*</span>}
        {hint && <span className="text-gray-400 font-normal">({hint})</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return `w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-colors ${
    hasError ? 'border-red-300 bg-red-50' : 'border-gray-200'
  }`
}
