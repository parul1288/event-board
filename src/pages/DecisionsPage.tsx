import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useEventStore } from '../store/eventStore'
import Layout from '../components/Layout'

export default function DecisionsPage() {
  const { id } = useParams<{ id: string }>()
  const { decisions, fetchDecisions } = useEventStore()

  useEffect(() => {
    if (id) fetchDecisions(id)
  }, [id])

  const open = decisions.filter((d) => d.status === 'open')
  const closed = decisions.filter((d) => d.status === 'closed')

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Decisions</h1>
          <button className="flex items-center gap-1.5 text-sm font-medium text-accent-600 hover:text-accent-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New poll
          </button>
        </div>

        {open.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Open</h2>
            <div className="space-y-2">
              {open.map((d) => (
                <DecisionCard key={d.id} title={d.title} description={d.description} status={d.status} />
              ))}
            </div>
          </section>
        )}

        {closed.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Closed</h2>
            <div className="space-y-2">
              {closed.map((d) => (
                <DecisionCard key={d.id} title={d.title} description={d.description} status={d.status} />
              ))}
            </div>
          </section>
        )}

        {decisions.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">No decisions yet. Create a poll to vote.</p>
          </div>
        )}
      </div>
    </Layout>
  )
}

function DecisionCard({ title, description, status }: { title: string; description: string | null; status: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${status === 'open' ? 'bg-accent-100 text-accent-700' : 'bg-gray-100 text-gray-500'}`}>
          {status}
        </span>
      </div>
    </div>
  )
}
