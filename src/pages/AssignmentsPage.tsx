import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useEventStore } from '../store/eventStore'
import Layout from '../components/Layout'

export default function AssignmentsPage() {
  const { id } = useParams<{ id: string }>()
  const { assignments, participants, fetchAssignments, fetchParticipants } = useEventStore()

  useEffect(() => {
    if (!id) return
    fetchAssignments(id)
    fetchParticipants(id)
  }, [id])

  const participantMap = Object.fromEntries(participants.map((p) => [p.id, p.name]))

  const groups: Record<string, typeof assignments> = {
    todo: assignments.filter((a) => a.status === 'todo'),
    in_progress: assignments.filter((a) => a.status === 'in_progress'),
    done: assignments.filter((a) => a.status === 'done'),
  }

  const groupLabels: Record<string, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done',
  }

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Assignments</h1>
          <button className="flex items-center gap-1.5 text-sm font-medium text-accent-600 hover:text-accent-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New task
          </button>
        </div>

        {assignments.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <p className="text-sm">No tasks yet. Add one to get started.</p>
          </div>
        ) : (
          Object.entries(groups).map(([status, items]) =>
            items.length > 0 ? (
              <section key={status}>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{groupLabels[status]}</h2>
                <div className="space-y-2">
                  {items.map((a) => (
                    <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                          {a.description && <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>}
                          <div className="flex items-center gap-3 mt-2">
                            {a.assigned_to && (
                              <span className="text-xs text-gray-500">
                                {participantMap[a.assigned_to] ?? 'Unknown'}
                              </span>
                            )}
                            {a.due_date && (
                              <span className="text-xs text-gray-400">
                                Due {new Date(a.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <StatusBadge status={a.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null
          )
        )}
      </div>
    </Layout>
  )
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
