import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEventStore } from '../store/eventStore'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import type { Assignment, Participant, TaskCategory } from '../types'

// Shared swipe constants
const REVEAL_W = 128
const SNAP_THRESHOLD = 50

const CATEGORIES: TaskCategory[] = ['Food', 'Decor', 'Supplies', 'Logistics', 'Other']

const CATEGORY_STYLES: Record<TaskCategory, { badge: string; dot: string }> = {
  Food:      { badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  Decor:     { badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400' },
  Supplies:  { badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-400' },
  Logistics: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  Other:     { badge: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-400' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssignmentsPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    assignments,
    participants,
    tasksLoading,
    tasksError,
    currentParticipantId,
    fetchEvent,
    fetchAssignments,
    fetchParticipants,
    setCurrentParticipant,
    assignTask,
    unassignTask,
    deleteTask,
  } = useEventStore()

  const { user } = useAuth()

  const [showNewTask, setShowNewTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Assignment | null>(null)

  useEffect(() => {
    if (!eventId) return
    fetchEvent(eventId)
    fetchAssignments(eventId)
    ;(async () => {
      await fetchParticipants(eventId)
      const ps = useEventStore.getState().participants
      if (user?.id) {
        const match = ps.find((p) => p.auth_user_id === user.id)
        if (match) {
          setCurrentParticipant(match.id)
          return
        }
      }
      // No match — redirect to board so user can join
      navigate(`/event/${eventId}`, { replace: true })
    })()
  }, [eventId])

  const currentParticipant = participants.find((p) => p.id === currentParticipantId)

  const handleIllDoThis = (assignmentId: string) => {
    if (!currentParticipantId) return
    assignTask(assignmentId, currentParticipantId)
  }

  // Group by category preserving CATEGORIES order; uncategorised goes to Other
  const grouped = CATEGORIES.reduce<Record<TaskCategory, Assignment[]>>((acc, cat) => {
    acc[cat] = assignments.filter((a) => (a.category ?? 'Other') === cat)
    return acc
  }, {} as Record<TaskCategory, Assignment[]>)

  const participantMap = Object.fromEntries(participants.map((p) => [p.id, p.name]))

  return (
    <Layout>
      <div className="p-4 pb-6 space-y-4">
        {/* Fetch error */}
        {tasksError && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Something went wrong. Pull down to refresh.
          </div>
        )}

        {/* Identity strip */}
        {currentParticipant && (
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
            <span className="w-7 h-7 rounded-full bg-accent-100 text-accent-700 text-xs font-bold flex items-center justify-center shrink-0">
              {currentParticipant.name[0].toUpperCase()}
            </span>
            <span className="text-sm text-gray-600">
              Signed in as{' '}
              <span className="font-semibold text-gray-900">{currentParticipant.name}</span>
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Tasks</h1>
          <button
            onClick={() => setShowNewTask(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-accent-600 hover:text-accent-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
        </div>

        {/* Loading skeletons */}
        {tasksLoading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5 flex-1 pr-4">
                    <div className="h-4 w-2/3 bg-gray-100 rounded" />
                    <div className="h-3 w-16 bg-gray-100 rounded-full" />
                  </div>
                  <div className="h-7 w-20 bg-gray-100 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!tasksLoading && assignments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">No tasks yet</p>
            <p className="text-xs text-gray-500 mb-5 max-w-xs">
              Add what needs to get done for the event.
            </p>
            <button
              onClick={() => setShowNewTask(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent-600 hover:bg-accent-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add First Task
            </button>
          </div>
        )}

        {/* Grouped task cards */}
        {!tasksLoading && assignments.length > 0 && (
          <div className="space-y-4">
            {CATEGORIES.map((cat) => {
              const items = grouped[cat]
              if (items.length === 0) return null
              return (
                <section key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_STYLES[cat].dot}`} />
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {cat} · {items.length}
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {items.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        currentParticipantId={currentParticipantId}
                        participantMap={participantMap}
                        onIllDoThis={() => handleIllDoThis(task.id)}
                        onUnassign={() => unassignTask(task.id)}
                        onDelete={() => deleteTask(task.id)}
                        onEdit={() => setEditingTask(task)}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {eventId && (
        <NewTaskModal
          isOpen={showNewTask}
          onClose={() => setShowNewTask(false)}
          eventId={eventId}
          participants={participants}
        />
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          participants={participants}
        />
      )}

    </Layout>
  )
}

// ─── Task card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Assignment
  currentParticipantId: string | null
  participantMap: Record<string, string>
  onIllDoThis: () => void
  onUnassign: () => void
  onDelete: () => void
  onEdit: () => void
}

function TaskCard({
  task,
  currentParticipantId,
  participantMap,
  onIllDoThis,
  onUnassign,
  onDelete,
  onEdit,
}: TaskCardProps) {
  const [deleting, setDeleting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [animate, setAnimate] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isHoriz = useRef(false)
  const startedAt = useRef(0)

  const cat = (task.category ?? 'Other') as TaskCategory
  const assignedName = task.assigned_to ? (participantMap[task.assigned_to] ?? 'Unknown') : null
  const isAssignedToMe = task.assigned_to === currentParticipantId

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  const closeSwipe = () => { setAnimate(true); setSwipeX(0) }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isHoriz.current = false
    startedAt.current = swipeX
    setAnimate(false)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.touches[0].clientX
    const dy = e.touches[0].clientY - touchStartY.current
    if (!isHoriz.current) {
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return
      if (Math.abs(dy) > Math.abs(dx)) return
      isHoriz.current = true
    }
    setSwipeX(Math.max(0, Math.min(REVEAL_W, startedAt.current + dx)))
  }

  const handleTouchEnd = () => {
    if (!isHoriz.current) return
    setAnimate(true)
    setSwipeX(swipeX > SNAP_THRESHOLD ? REVEAL_W : 0)
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 group">
      {/* Swipe action buttons — mobile only */}
      <div className="absolute inset-y-0 right-0 flex md:hidden" style={{ width: REVEAL_W }}>
        <button
          onClick={() => { closeSwipe(); onEdit() }}
          className="w-16 flex flex-col items-center justify-center gap-0.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-[10px] font-semibold"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-16 flex flex-col items-center justify-center gap-0.5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-[10px] font-semibold disabled:opacity-60"
        >
          {deleting ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
          Delete
        </button>
      </div>

      {/* Card content — translates left on swipe */}
      <div
        className="relative bg-white px-4 py-3 flex items-center gap-3"
        style={{ transform: `translateX(-${swipeX}px)`, transition: animate ? 'transform 200ms ease-out' : 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={swipeX > 0 ? (e) => { e.stopPropagation(); closeSwipe() } : undefined}
      >
        {/* Left: name + badge */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{task.item}</p>
          <span className={`mt-1 inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_STYLES[cat].badge}`}>
            {cat}
          </span>
        </div>

        {/* Right: assignment area + desktop menu */}
        <div className="shrink-0 flex items-center gap-2">
          {!task.assigned_to && (
            <button
              onClick={onIllDoThis}
              className="text-xs font-semibold text-accent-600 hover:text-accent-700 bg-accent-50 hover:bg-accent-100 border border-accent-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              I'll do this
            </button>
          )}

          {task.assigned_to && isAssignedToMe && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-accent-700 bg-accent-50 border border-accent-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-accent-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                  {(assignedName ?? 'Y')[0].toUpperCase()}
                </span>
                You
              </span>
              <button
                onClick={onUnassign}
                className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                unassign
              </button>
            </div>
          )}

          {task.assigned_to && !isAssignedToMe && (
            <span className="text-xs text-gray-600 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                {(assignedName ?? '?')[0].toUpperCase()}
              </span>
              <span className="truncate max-w-[72px]">{assignedName}</span>
            </span>
          )}

          {/* Desktop three-dots menu */}
          <div className="relative hidden md:block shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
              className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="More options"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl border border-gray-200 shadow-md py-1 min-w-[110px] overflow-hidden">
                  <button
                    onClick={() => { setMenuOpen(false); onEdit() }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-blue-600 hover:bg-blue-50 text-left"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); handleDelete() }}
                    disabled={deleting}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Task modal ──────────────────────────────────────────────────────────

interface EditTaskModalProps {
  task: Assignment
  onClose: () => void
  participants: Participant[]
}

function EditTaskModal({ task, onClose }: EditTaskModalProps) {
  const { updateAssignment } = useEventStore()
  const itemRef = useRef<HTMLInputElement>(null)

  const [item, setItem] = useState(task.item)
  const [category, setCategory] = useState<TaskCategory>((task.category as TaskCategory) ?? 'Other')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTimeout(() => itemRef.current?.focus(), 50)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = item.trim()
    if (!t) return setError('Enter a task name.')
    setSubmitting(true)
    setError(null)
    const ok = await updateAssignment(task.id, t, category)
    setSubmitting(false)
    if (!ok) {
      setError("Couldn't save. Please try again.")
      return
    }
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-20" onClick={onClose} />
      <div className="fixed bottom-0 inset-x-0 bg-white rounded-t-2xl z-30">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="px-4 pt-2 pb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Edit Task</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-4 pb-8 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Item <span className="text-accent-500">*</span>
            </label>
            <input
              ref={itemRef}
              type="text"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full appearance-none px-3 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent pr-9"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {error && <p className="text-sm text-red-500 px-1">{error}</p>}
          <button
            type="submit"
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
                Save Changes
              </>
            )}
          </button>
        </form>
      </div>
    </>
  )
}

// ─── New Task modal (bottom sheet) ───────────────────────────────────────────

interface NewTaskModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  participants: Participant[]
}

function NewTaskModal({ isOpen, onClose, eventId, participants }: NewTaskModalProps) {
  const { createAssignment } = useEventStore()
  const itemRef = useRef<HTMLInputElement>(null)

  const [item, setItem] = useState('')
  const [category, setCategory] = useState<TaskCategory>('Other')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => itemRef.current?.focus(), 300)
    } else {
      setItem('')
      setCategory('Other')
      setAssignedTo('')
      setError(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = item.trim()
    if (!t) return setError('Enter a task name.')
    setSubmitting(true)
    setError(null)
    const ok = await createAssignment(eventId, t, category, assignedTo || null)
    setSubmitting(false)
    if (!ok) {
      setError("Couldn't save. Please try again.")
      return
    }
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-20 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 inset-x-0 bg-white rounded-t-2xl z-30 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-4 pt-2 pb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">New Task</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 pb-8 space-y-4">
          {/* Item name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Item <span className="text-accent-500">*</span>
            </label>
            <input
              ref={itemRef}
              type="text"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="Chocolate cake"
              className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full appearance-none px-3 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent pr-9"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Assigned to */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Assigned to <span className="text-gray-400 font-normal normal-case">(optional)</span>
            </label>
            <div className="relative">
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full appearance-none px-3 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent pr-9"
              >
                <option value="">Unassigned</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {error && <p className="text-sm text-red-500 px-1">{error}</p>}

          <button
            type="submit"
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
                Add Task
              </>
            )}
          </button>
        </form>
      </div>
    </>
  )
}

