import { useState } from 'react'
import type { ProjectFull } from '../../types'
import TasksTab from './TasksTab'
import StakeholdersTab from './StakeholdersTab'
import MatrixTab from './MatrixTab'

type EditorTab = 'tasks' | 'stakeholders' | 'matrix'

interface Props {
  data: ProjectFull
  onReload: () => void
}

export default function EditorView({ data, onReload }: Props) {
  const [tab, setTab] = useState<EditorTab>('tasks')

  const tabs: { id: EditorTab; label: string }[] = [
    { id: 'tasks', label: 'Zadania' },
    { id: 'stakeholders', label: 'Interesariusze' },
    { id: 'matrix', label: 'Macierz RASCI' },
  ]

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tasks' && <TasksTab data={data} onReload={onReload} />}
      {tab === 'stakeholders' && <StakeholdersTab data={data} onReload={onReload} />}
      {tab === 'matrix' && <MatrixTab data={data} onReload={onReload} />}
    </div>
  )
}
