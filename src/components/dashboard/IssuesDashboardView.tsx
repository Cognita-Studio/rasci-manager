import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Link2, ShieldAlert } from 'lucide-react'
import type { ProjectFull, IssueStatus } from '../../types'
import { ISSUE_STATUS_COLORS, PRIORITY_COLORS, riskScoreColor } from '../../types'
import { useT, useTranslatedLabels } from '../../lib/i18n'

interface Props { data: ProjectFull }

export default function IssuesDashboardView({ data }: Props) {
  const { t } = useT()
  const { ISSUE_STATUS_LABELS, PRIORITY_LABELS } = useTranslatedLabels()
  const [statusFilter, setStatusFilter] = useState<IssueStatus | ''>('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const allTasks = useMemo(() => data.taskGroups.flatMap(g => g.tasks), [data.taskGroups])

  const filtered = useMemo(() => {
    return data.issues.filter(issue => {
      if (statusFilter && issue.status !== statusFilter) return false
      if (priorityFilter && issue.priority !== priorityFilter) return false
      if (categoryFilter && issue.category_id !== categoryFilter) return false
      return true
    })
  }, [data.issues, statusFilter, priorityFilter, categoryFilter])

  const getLinkedTasks = (issueId: string) =>
    data.issueTaskLinks.filter(l => l.issue_id === issueId).map(l => allTasks.find(t => t.id === l.task_id)).filter(Boolean)
  const getLinkedRisks = (issueId: string) =>
    data.issueRiskLinks.filter(l => l.issue_id === issueId).map(l => data.risks.find(r => r.id === l.risk_id)).filter(Boolean)
  const getOwnerName = (id: string | null) =>
    id ? (data.projectStakeholders.find(s => s.stakeholderId === id)?.name ?? '—') : '—'
  const getCatName = (id: string | null) =>
    id ? (data.issueCategories.find(c => c.id === id)?.name ?? '') : ''
  const getCatColor = (id: string | null) =>
    id ? (data.issueCategories.find(c => c.id === id)?.color ?? '#6b7280') : '#6b7280'

  const toggle = (id: string) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  if (data.issues.length === 0) {
    return (
      <div className="card p-12 text-center opacity-50" style={{ color: 'var(--color-text-body)' }}>
        {t.issueNoData}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card px-4 py-3 flex flex-wrap gap-2 items-center">
        <span className="text-sm font-medium opacity-60" style={{ color: 'var(--color-text-body)' }}>{t.filters}</span>
        <select
          className="input text-sm py-1 min-w-0"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as IssueStatus | '')}
        >
          <option value="">{t.issueStatusAll}</option>
          {Object.entries(ISSUE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          className="input text-sm py-1 min-w-0"
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
        >
          <option value="">{t.issuePriorityAll}</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {data.issueCategories.length > 0 && (
          <select
            className="input text-sm py-1 min-w-0"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="">{t.issueCategoryAll}</option>
            {data.issueCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        {(statusFilter || priorityFilter || categoryFilter) && (
          <button
            className="btn-ghost text-sm"
            onClick={() => { setStatusFilter(''); setPriorityFilter(''); setCategoryFilter('') }}
          >
            {t.clearFilters}
          </button>
        )}
      </div>

      <div className="text-sm font-medium opacity-60 px-1" style={{ color: 'var(--color-text-body)' }}>
        {t.issueListTitle(filtered.length)}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.issueNoFiltered}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(issue => {
            const isExpanded = expanded.has(issue.id)
            const linkedTasks = getLinkedTasks(issue.id)
            const linkedRisks = getLinkedRisks(issue.id)
            return (
              <div key={issue.id} className="card overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-black/5"
                  onClick={() => toggle(issue.id)}
                >
                  {isExpanded ? <ChevronDown size={15} className="flex-shrink-0 opacity-40" /> : <ChevronRight size={15} className="flex-shrink-0 opacity-40" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm" style={{ color: 'var(--color-text-body)' }}>{issue.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ISSUE_STATUS_COLORS[issue.status]}`}>
                        {ISSUE_STATUS_LABELS[issue.status]}
                      </span>
                      {issue.priority && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[issue.priority]}`}>
                          {PRIORITY_LABELS[issue.priority]}
                        </span>
                      )}
                      {issue.category_id && (
                        <span className="text-xs px-2 py-0.5 rounded-full text-white"
                          style={{ background: getCatColor(issue.category_id) }}>
                          {getCatName(issue.category_id)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs opacity-50 flex-shrink-0" style={{ color: 'var(--color-text-body)' }}>
                    {issue.deadline && <span>{new Date(issue.deadline).toLocaleDateString()}</span>}
                    <span>{getOwnerName(issue.owner_id)}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"
                    style={{ borderColor: 'var(--color-border-card)', backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 85%, var(--color-bg-page))' }}>
                    {issue.description && (
                      <div className="col-span-1 sm:col-span-2">
                        <span className="opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.issueDescription}</span><br />
                        <span style={{ color: 'var(--color-text-body)' }}>{issue.description}</span>
                      </div>
                    )}
                    {linkedTasks.length > 0 && (
                      <div className="col-span-1 sm:col-span-2">
                        <span className="opacity-50 flex items-center gap-1 mb-1" style={{ color: 'var(--color-text-body)' }}>
                          <Link2 size={11} /> {t.issueLinkedTasks}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {linkedTasks.map(task => task && (
                            <span key={task.id} className="border rounded px-2 py-0.5"
                              style={{ borderColor: 'var(--color-border-card)', color: 'var(--color-text-body)' }}>
                              {task.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {linkedRisks.length > 0 && (
                      <div className="col-span-1 sm:col-span-2">
                        <span className="opacity-50 flex items-center gap-1 mb-1" style={{ color: 'var(--color-text-body)' }}>
                          <ShieldAlert size={11} /> {t.issueLinkedRisks}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {linkedRisks.map(risk => risk && (
                            <span key={risk.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${riskScoreColor(risk.score)}`}>
                              <b>{risk.score}</b> {risk.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
