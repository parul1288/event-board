import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useEventStore } from '../store/eventStore'
import Layout from '../components/Layout'
import type { Participant } from '../types'

const REVEAL_W = 128
const SNAP_THRESHOLD = 50

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const {
    expenses,
    participants,
    expensesLoading,
    expensesError,
    fetchExpenses,
    fetchParticipants,
    deleteExpense,
  } = useEventStore()

  const [showAdd, setShowAdd] = useState(false)
  const [editingExpense, setEditingExpense] = useState<typeof expenses[0] | null>(null)

  useEffect(() => {
    if (!eventId) return
    fetchExpenses(eventId)
    fetchParticipants(eventId)
  }, [eventId])

  const participantMap = Object.fromEntries(participants.map((p) => [p.id, p.name]))
  const total = expenses.reduce((sum, e) => sum + e.amount, 0)
  const perPerson = participants.length > 0 ? total / participants.length : 0

  // Per-participant balance: positive = owed money, negative = owes money
  const balances = participants.map((p) => {
    const paid = expenses
      .filter((e) => e.paid_by === p.id)
      .reduce((sum, e) => sum + e.amount, 0)
    const net = paid - perPerson
    return { id: p.id, name: p.name, paid, net }
  })

  return (
    <Layout>
      <div className="p-4 pb-8 space-y-4">
        {/* Fetch error */}
        {expensesError && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Something went wrong. Pull down to refresh.
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Expenses</h1>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-accent-600 hover:text-accent-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Expense
          </button>
        </div>

        {/* Loading skeletons */}
        {expensesLoading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5 flex-1 pr-4">
                    <div className="h-4 w-2/3 bg-gray-100 rounded" />
                    <div className="h-3 w-28 bg-gray-100 rounded" />
                  </div>
                  <div className="h-5 w-14 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!expensesLoading && expenses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">No expenses yet</p>
            <p className="text-xs text-gray-500 mb-5 max-w-xs">
              Track what's been spent for the event.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent-600 hover:bg-accent-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add First Expense
            </button>
          </div>
        )}

        {/* Expenses list */}
        {!expensesLoading && expenses.length > 0 && (
          <>
            <div className="space-y-2">
              {expenses.map((e) => (
                <ExpenseCard
                  key={e.id}
                  expense={e}
                  paidByName={participantMap[e.paid_by] ?? 'Unknown'}
                  onDelete={() => deleteExpense(e.id)}
                  onEdit={() => setEditingExpense(e)}
                />
              ))}
            </div>

            {/* Summary section */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Totals header */}
              <div className="px-4 py-3 bg-accent-50 border-b border-accent-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-accent-700 uppercase tracking-wider">Total spent</p>
                  <p className="text-2xl font-bold text-accent-800 mt-0.5">{fmt(total)}</p>
                </div>
                {participants.length > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-accent-600">
                      {fmt(perPerson)} per person
                    </p>
                    <p className="text-xs text-accent-500 mt-0.5">
                      {participants.length} {participants.length === 1 ? 'person' : 'people'} · equal split
                    </p>
                  </div>
                )}
              </div>

              {/* Per-person breakdown */}
              {participants.length > 0 && (
                <div className="divide-y divide-gray-100">
                  {balances.map((b) => {
                    const isOwed = b.net > 0.005
                    const owes = b.net < -0.005

                    return (
                      <div key={b.id} className="px-4 py-3 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-sm font-bold flex items-center justify-center shrink-0">
                          {b.name[0].toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{b.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            paid {fmt(b.paid)}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            isOwed
                              ? 'bg-green-100 text-green-700'
                              : owes
                              ? 'bg-red-100 text-red-600'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {isOwed
                            ? `owed ${fmt(b.net)}`
                            : owes
                            ? `owes ${fmt(Math.abs(b.net))}`
                            : 'settled'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {eventId && (
        <AddExpenseModal
          isOpen={showAdd}
          onClose={() => setShowAdd(false)}
          eventId={eventId}
          participants={participants}
        />
      )}

      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
          participants={participants}
        />
      )}
    </Layout>
  )
}

// ─── Expense card ─────────────────────────────────────────────────────────────

interface ExpenseCardProps {
  expense: { id: string; item: string; amount: number; paid_by: string }
  paidByName: string
  onDelete: () => Promise<void>
  onEdit: () => void
}

function ExpenseCard({ expense, paidByName, onDelete, onEdit }: ExpenseCardProps) {
  const [deleting, setDeleting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [animate, setAnimate] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isHoriz = useRef(false)
  const startedAt = useRef(0)

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
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{expense.item}</p>
          <p className="text-xs text-gray-400 mt-0.5">Paid by {paidByName}</p>
        </div>
        <p className="shrink-0 text-sm font-bold text-gray-900">{fmt(expense.amount)}</p>

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
  )
}

// ─── Edit Expense modal ────────────────────────────────────────────────────────

interface EditExpenseModalProps {
  expense: { id: string; item: string; amount: number; paid_by: string }
  onClose: () => void
  participants: Participant[]
}

function EditExpenseModal({ expense, onClose, participants }: EditExpenseModalProps) {
  const { updateExpense } = useEventStore()
  const titleRef = useRef<HTMLInputElement>(null)

  const [item, setItem] = useState(expense.item)
  const [amount, setAmount] = useState(String(expense.amount))
  const [paidBy, setPaidBy] = useState(expense.paid_by)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 50)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = item.trim()
    const a = parseFloat(amount)
    if (!t) return setError('Enter an item name.')
    if (isNaN(a) || a <= 0) return setError('Enter a valid amount.')
    if (!paidBy) return setError('Select who paid.')
    setSubmitting(true)
    setError(null)
    const ok = await updateExpense(expense.id, t, Math.round(a * 100) / 100, paidBy)
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
          <h2 className="text-base font-semibold text-gray-900">Edit Expense</h2>
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
              ref={titleRef}
              type="text"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Amount <span className="text-accent-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Paid by <span className="text-accent-500">*</span>
            </label>
            <div className="relative">
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full appearance-none px-3 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent pr-9"
              >
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
                Save Changes
              </>
            )}
          </button>
        </form>
      </div>
    </>
  )
}

// ─── Add Expense modal (bottom sheet) ─────────────────────────────────────────

interface AddExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  participants: Participant[]
}

function AddExpenseModal({ isOpen, onClose, eventId, participants }: AddExpenseModalProps) {
  const { createExpense } = useEventStore()
  const titleRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-select first participant when list loads or modal opens
  useEffect(() => {
    if (isOpen) {
      if (participants.length > 0 && !paidBy) setPaidBy(participants[0].id)
      setTimeout(() => titleRef.current?.focus(), 300)
    } else {
      setTitle('')
      setAmount('')
      setPaidBy(participants[0]?.id ?? '')
      setError(null)
    }
  }, [isOpen])

  // Keep paidBy in sync if participants load after modal opens
  useEffect(() => {
    if (participants.length > 0 && !paidBy) setPaidBy(participants[0].id)
  }, [participants])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = title.trim()
    const a = parseFloat(amount)
    if (!t) return setError('Enter an item name.')
    if (isNaN(a) || a <= 0) return setError('Enter a valid amount.')
    if (!paidBy) return setError('Select who paid.')

    setSubmitting(true)
    setError(null)
    const ok = await createExpense(
      eventId,
      t,
      Math.round(a * 100) / 100,
      paidBy
    )
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
          <h2 className="text-base font-semibold text-gray-900">Add Expense</h2>
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
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pizza"
              className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Amount <span className="text-accent-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Paid by */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Paid by <span className="text-accent-500">*</span>
            </label>
            {participants.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No participants found for this event.</p>
            ) : (
              <div className="relative">
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full appearance-none px-3 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent pr-9"
                >
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            )}
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
                Add Expense
              </>
            )}
          </button>
        </form>
      </div>
    </>
  )
}
