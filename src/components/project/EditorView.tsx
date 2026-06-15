import { useState } from 'react'
import type { ProjectFull } from '../../types'
import TasksTab from './TasksTab'
import StakeholdersTab from './StakeholdersTab'
import MatrixTab from './MatrixTab'
import RisksTab from './RisksTab'
import RiskCategoriesTab from './RiskCategoriesTab'
import { useT } from '../../lib/i18n'

type EditorTab = 'tasks' | 'stakeholders' | 'matrix' | 'risks' | 'riskCategories'

interface Props { data: ProjectFull; onReload: () => void }

export default function EditorView({ data, onReload }: Props) {
  const { t } = useT()
  const [tab, setTab] = useState<EditorTab>('tasks')

  const tabs: { id: EditorTab; label: string }[] = [
    { id: 'tasks', label: t.tasks },
    { id: 'stakeholders', label: t.stakeholders },
    { id: 'matrix', label: t.matrix },
    { id: 'risks', label: 'Ryzyka' },
    { id: 'riskCategories', label: 'Kat. ryzyk' },
  ]

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {tabs.map(tb => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
              tab === tb.id ? 'border-current' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
            style={tab === tb.id ? { color: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : {}}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'tasks' && <TasksTab data={data} onReload={onReload} />}
      {tab === 'stakeholders' && <StakeholdersTab data={data} onReload={onReload} />}
      {tab === 'matrix' && <MatrixTab data={data} onReload={onReload} />}
      {tab === 'risks' && <RisksTab data={data} onReload={onReload} />}
      {tab === 'riskCategories' && <RiskCategoriesTab data={data} onReload={onReload} />}
    </div>
  )
}
