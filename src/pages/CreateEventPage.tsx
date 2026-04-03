import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// Pull first name from Google user metadata (full_name or name), falling back to email prefix.
function authDisplayName(user: ReturnType<typeof useAuth>['user']): string {
  if (!user) return ''
  const full = (user.user_metadata?.full_name ?? user.user_metadata?.name ?? '') as string
  if (full.trim()) return full.split(' ')[0]
  return user.email?.split('@')[0] ?? ''
}

export default function CreateEventPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // About You
  const [creatorName, setCreatorName] = useState('')

  // Event details
  const [eventName, setEventName] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [guestCount, setGuestCount] = useState('')

  // Form state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ creatorName?: string; eventName?: string }>({})

  const creatorInputRef = useRef<HTMLInputElement>(null)

  // Pre-fill name from Google display name
  useEffect(() => {
    const authName = authDisplayName(user)
    if (authName) setCreatorName(authName)
    creatorInputRef.current?.focus()
  }, [user])

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
        created_by_auth_id: user?.id ?? null,
      })
      .select()
      .single()

    if (eventError || !event) {
      setError(eventError?.message ?? 'Failed to create event.')
      setLoading(false)
      return
    }

    // 2. Insert creator as first participant (linking their auth user ID)
    const { data: creator, error: creatorError } = await supabase
      .from('participants')
      .insert({ event_id: event.id, name: creatorName.trim(), auth_user_id: user?.id ?? null })
      .select()
      .single()

    if (creatorError || !creator) {
      setError('Event created but failed to add you as a participant.')
      setLoading(false)
      return
    }

    // 3. Update event with created_by now that we have the creator's participant_id
    await supabase
      .from('events')
      .update({ created_by: creator.id })
      .eq('id', event.id)

    setLoading(false)
    navigate(`/event/${event.id}`)
  }

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
