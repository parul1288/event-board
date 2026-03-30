import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useEventStore } from '../store/eventStore'
import Layout from '../components/Layout'

export default function ExpensesPage() {
  const { id } = useParams<{ id: string }>()
  const { expenses, participants, fetchExpenses, fetchParticipants } = useEventStore()

  useEffect(() => {
    if (!id) return
    fetchExpenses(id)
    fetchParticipants(id)
  }, [id])

  const participantMap = Object.fromEntries(participants.map((p) => [p.id, p.name]))
  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Expenses</h1>
          <button className="flex items-center gap-1.5 text-sm font-medium text-accent-600 hover:text-accent-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add expense
          </button>
        </div>

        {expenses.length > 0 && (
          <div className="bg-accent-50 border border-accent-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-accent-700">Total spent</p>
              <p className="text-2xl font-semibold text-accent-800 mt-0.5">${total.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-accent-600">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
              <p className="text-xs text-accent-600 mt-0.5">{participants.length} people</p>
            </div>
          </div>
        )}

        {expenses.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <p className="text-sm">No expenses yet. Add one to start tracking.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map((e) => (
              <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{e.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Paid by {participantMap[e.paid_by] ?? 'Unknown'}
                      {e.split_among.length > 0 && ` · split ${e.split_among.length} ways`}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-gray-900">${e.amount.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
