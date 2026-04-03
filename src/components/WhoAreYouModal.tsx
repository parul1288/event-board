import { useState } from 'react'
import type { Participant } from '../types'

export interface WhoAreYouModalProps {
  isOpen: boolean
  onClose: () => void
  participants: Participant[]
  onSelect: (id: string) => void
  onAdd: (name: string) => Promise<void>
  /** When true the modal cannot be dismissed without selecting an identity */
  required?: boolean
  subtitle?: string
}

export default function WhoAreYouModal({
  isOpen,
  onClose,
  participants,
  onSelect,
  onAdd,
  required = false,
  subtitle,
}: WhoAreYouModalProps) {
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    await onAdd(name)
    setAdding(false)
    setNewName('')
  }

  const defaultSubtitle = subtitle ?? 'Select your name'

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-20 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={required ? undefined : onClose}
      />
      <div
        className={`fixed bottom-0 inset-x-0 bg-white rounded-t-2xl z-30 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-4 pt-2 pb-2 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Who are you?</h2>
            <p className="text-xs text-gray-400 mt-0.5">{defaultSubtitle}</p>
          </div>
          {!required && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0 mt-0.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="px-4 pb-8 max-h-[65vh] overflow-y-auto space-y-3">
          {/* Existing participants */}
          {participants.length > 0 && (
            <div className="space-y-2">
              {participants.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-accent-50 border border-gray-200 hover:border-accent-300 rounded-xl transition-colors text-left"
                >
                  <span className="w-8 h-8 rounded-full bg-accent-100 text-accent-700 text-sm font-bold flex items-center justify-center shrink-0">
                    {p.name[0].toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-gray-800">{p.name}</span>
                  <svg className="w-4 h-4 text-gray-300 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}

          {/* Add yourself */}
          <div className={participants.length > 0 ? 'pt-1 border-t border-gray-100' : ''}>
            <p className="text-xs font-medium text-gray-500 mb-2">
              {participants.length > 0 ? "Not listed? Add yourself:" : "Add your name:"}
            </p>
            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Your name"
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!newName.trim() || adding}
                className="px-4 py-2.5 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
              >
                {adding ? '…' : 'Join'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
