import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useEventStore } from '../store/eventStore'
import Layout from '../components/Layout'

export default function EventBoard() {
  const { id } = useParams<{ id: string }>()
  const { currentEvent, participants, decisions, assignments, expenses, fetchEvent, fetchParticipants, fetchDecisions, fetchAssignments, fetchExpenses } = useEventStore()

  useEffect(() => {
    if (!id) return
    fetchEvent(id)
    fetchParticipants(id)
    fetchDecisions(id)
    fetchAssignments(id)
    fetchExpenses(id)
  }, [id])

  const openDecisions = decisions.filter((d) => d.status === 'open').length
  const pendingAssignments = assignments.filter((a) => a.status !== 'done').length
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="People" value={participants.length} />
          <StatCard label="Open polls" value={openDecisions} />
          <StatCard label="Tasks left" value={pendingAssignments} />
        </div>

        <Section title="Recent Decisions">
          {decisions.length === 0 ? (
            <EmptyState message="No decisions yet." />
          ) : (
            decisions.slice(0, 3).map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-800 truncate pr-2">{d.title}</span>
                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${d.status === 'open' ? 'bg-accent-100 text-accent-700' : 'bg-gray-100 text-gray-500'}`}>
                  {d.status}
                </span>
              </div>
            ))
          )}
        </Section>

        <Section title="Upcoming Tasks">
          {assignments.length === 0 ? (
            <EmptyState message="No tasks yet." />
          ) : (
            assignments.slice(0, 3).map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-800 truncate pr-2">{a.title}</span>
                <StatusBadge status={a.status} />
              </div>
            ))
          )}
        </Section>

        <Section title="Expenses">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</span>
            <span className="text-lg font-semibold text-gray-900">${totalExpenses.toFixed(2)}</span>
          </div>
        </Section>
      </div>
    </Layout>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="px-4">{children}</div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-gray-400 py-4 text-center">{message}</p>
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    todo: 'bg-gray-100 text-gray-500',
    in_progress: 'bg-blue-100 text-blue-700',
    done: 'bg-green-100 text-green-700',
  }
  return (
    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
