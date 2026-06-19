import { forwardRef, useState, useMemo } from 'react'
import type { ProjectFull, Priority, TaskStatus, Task, TaskStep } from '../../types'
import { PRIORITY_COLORS, STATUS_COLORS, riskScoreColor, RISK_STATUS_COLORS, ISSUE_STATUS_COLORS, deriveTaskStatus } from '../../types'
import { useT, useTranslatedLabels } from '../../lib/i18n'
import RoleBadge from '../ui/RoleBadge'
import type { RasciRole } from '../../types'
import { ChevronDown, ChevronRight, Filter, X, ShieldAlert, FileWarning, ListChecks, Pencil, Trash2, Plus } from 'lucide-react'
import { updateStep, deleteStep, createStep, syncTaskStatusFromSteps } from '../../lib/db'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'

interface Filters {
  priority: Priority | ''
  status: TaskStatus | ''
  deadline: 'overdue' | 'this_week' | 'this_month' | ''
}

interface Props { data: ProjectFull; onReload: () => void }

const DashboardView = forwardRef<HTMLDivElement, Props>(({ data, onReload }, ref) => {
  const { t } = useT()
  const { PRIORITY_LABELS, STATUS_LABELS, RISK_STATUS_LABELS, ISSUE_STATUS_LABELS } = useTranslatedLabels()
  const [stepModal, setStepModal] = useState<{ mode: 'create' | 'edit'; taskId: string; step?: TaskStep } | null>(null)
  const [sName, setSName] = useState('')
  const [sStatus, setSStatus] = useState<TaskStatus>('not_started')
  const [stepSaving, setStepSaving] = useState(false)

  const STATUS_KEYS: TaskStatus[] = ['not_started', 'in_progress', 'blocked', 'completed']

  const stepsForTask = useMemo(() => {
    const m: Record<string, TaskStep[]> = {}
    for (const s of data.steps) (m[s.task_id] ??= []).push(s)
    return m
  }, [data.steps])

  const openStepCreate = (taskId: string) => {
    setSName(''); setSStatus('not_started'); setStepModal({ mode: 'create', taskId })
  }
  const openStepEdit = (step: TaskStep) => {
    setSName(step.name); setSStatus(step.status); setStepModal({ mode: 'edit', taskId: step.task_id, step })
  }
  const saveStep = async () => {
    if (!sName.trim() || !stepModal) return
    setStepSaving(true)
    try {
      const taskSteps = stepsForTask[stepModal.taskId] ?? []
      if (stepModal.mode === 'create') {
        await createStep(stepModal.taskId, sName.trim(), taskSteps.length)
        const newSteps = [...taskSteps, { status: sStatus } as TaskStep]
        await syncTaskStatusFromSteps(stepModal.taskId, deriveTaskStatus(newSteps))
      } else if (stepModal.step) {
        await updateStep(stepModal.step.id, { name: sName.trim(), status: sStatus })
        const newSteps = taskSteps.map(s => s.id === stepModal.step!.id ? { ...s, status: sStatus } : s)
        await syncTaskStatusFromSteps(stepModal.taskId, deriveTaskStatus(newSteps))
      }
      onReload(); setStepModal(null)
    } finally { setStepSaving(false) }
  }
  const removeStep = async (step: TaskStep) => {
    if (!confirm(t.stepDeleteConfirm(step.name))) return
    await deleteStep(step.id)
    const remaining = (stepsForTask[step.task_id] ?? []).filter(s => s.id !== step.id)
    if (remaining.length > 0) await syncTaskStatusFromSteps(step.task_id, deriveTaskStatus(remaining))
    onReload()
  }
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<Filters>({ priority: '', status: '', deadline: '' })
  const [showFilters, setShowFilters] = useState(false)

  const stakeholdersByGroup = (gId: string) =>
    data.projectStakeholders.filter(s => s.groupId === gId).sort((a, b) => a.order - b.order)
  const ungroupedStakeholders = data.projectStakeholders.filter(s => !s.groupId).sort((a, b) => a.order - b.order)
  const allStakeholders = [
    ...data.stakeholderGroups.flatMap(g => stakeholdersByGroup(g.id)),
    ...ungroupedStakeholders,
  ]

  const assignMap = useMemo(() => {
    const m: Record<string, Record<string, RasciRole[]>> = {}
    for (const a of data.assignments) {
      if (!m[a.task_id]) m[a.task_id] = {}
      m[a.task_id][a.stakeholder_id] = a.roles as RasciRole[]
    }
    return m
  }, [data.assignments])

  const matchesFilters = (task: Task) => {
    if (filters.priority && task.priority !== filters.priority) return false
    if (filters.status && task.status !== filters.status) return false
    if (filters.deadline) {
      if (!task.deadline) return false
      const d = new Date(task.deadline)
      const now = new Date()
      if (filters.deadline === 'overdue' && d >= now) return false
      if (filters.deadline === 'this_week') {
        const end = new Date(); end.setDate(now.getDate() + 7)
        if (d < now || d > end) return false
      }
      if (filters.deadline === 'this_month') {
        const end = new Date(); end.setDate(now.getDate() + 30)
        if (d < now || d > end) return false
      }
    }
    return true
  }

  const activeFilterCount = [filters.priority, filters.status, filters.deadline].filter(Boolean).length
  const toggleGroup = (id: string) => setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const clearFilters = () => setFilters({ priority: '', status: '', deadline: '' })

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const toggleTask = (id: string) => setExpandedTasks(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const risksForTask = useMemo(() => {
    const m: Record<string, typeof data.risks> = {}
    for (const link of data.riskTaskLinks) {
      const risk = data.risks.find(r => r.id === link.risk_id)
      if (risk) (m[link.task_id] ??= []).push(risk)
    }
    return m
  }, [data.risks, data.riskTaskLinks])

  const issuesForTask = useMemo(() => {
    const m: Record<string, typeof data.issues> = {}
    for (const link of data.issueTaskLinks) {
      const issue = data.issues.find(i => i.id === link.issue_id)
      if (issue) (m[link.task_id] ??= []).push(issue)
    }
    return m
  }, [data.issues, data.issueTaskLinks])

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary text-xs gap-1.5 ${activeFilterCount > 0 ? 'border-current' : ''}`}
          style={activeFilterCount > 0 ? { borderColor: 'var(--color-primary)', color: 'var(--color-primary)' } : {}}
        >
          <Filter size={13} />
          {t.filters}
          {activeFilterCount > 0 && (
            <span className="rounded-full w-4 h-4 flex items-center justify-center text-[10px] text-white"
              style={{ background: 'var(--color-primary)' }}>
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="btn-ghost text-xs gap-1 opacity-60">
            <X size={12} /> {t.clearFilters}
          </button>
        )}
        {showFilters && (
          <div className="flex gap-2 flex-wrap items-center">
            <select className="input w-auto text-xs py-1.5" value={filters.priority}
              onChange={e => setFilters(f => ({ ...f, priority: e.target.value as Priority | '' }))}>
              <option value="">{t.priorityAll}</option>
              {(Object.entries(PRIORITY_LABELS)).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select className="input w-auto text-xs py-1.5" value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value as TaskStatus | '' }))}>
              <option value="">{t.statusAll}</option>
              {(Object.entries(STATUS_LABELS)).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select className="input w-auto text-xs py-1.5" value={filters.deadline}
              onChange={e => setFilters(f => ({ ...f, deadline: e.target.value as Filters['deadline'] }))}>
              <option value="">{t.deadlineAll}</option>
              <option value="overdue">{t.overdue}</option>
              <option value="this_week">{t.thisWeek}</option>
              <option value="this_month">{t.thisMonth}</option>
            </select>
          </div>
        )}
      </div>

      {/* Desktop: Table view */}
      <div className="hidden md:block" ref={ref}>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 80%, var(--color-bg-page))' }}>
                <th className="text-left px-4 py-3 font-semibold w-64 min-w-[16rem] sticky left-0 z-10"
                  style={{ color: 'var(--color-text-body)', backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 80%, var(--color-bg-page))' }}>
                  {t.task}
                </th>
                <th className="text-left px-3 py-3 font-medium w-24 opacity-60" style={{ color: 'var(--color-text-body)' }}>{t.status}</th>
                <th className="text-left px-3 py-3 font-medium w-24 opacity-60" style={{ color: 'var(--color-text-body)' }}>{t.priority}</th>
                <th className="text-left px-3 py-3 font-medium w-24 opacity-60" style={{ color: 'var(--color-text-body)' }}>{t.deadline}</th>
                {data.stakeholderGroups.map(sg => stakeholdersByGroup(sg.id).length > 0 && (
                  <th key={`sg-${sg.id}`} colSpan={stakeholdersByGroup(sg.id).length}
                    className="px-2 py-2 text-center text-xs font-semibold border-l theme-group-bg theme-group-text"
                    style={{ borderColor: 'var(--color-border-card)' }}>
                    {sg.name}
                  </th>
                ))}
                {ungroupedStakeholders.length > 0 && (
                  <th colSpan={ungroupedStakeholders.length}
                    className="px-2 py-2 text-center text-xs font-semibold border-l opacity-40"
                    style={{ borderColor: 'var(--color-border-card)', color: 'var(--color-text-body)' }}>—</th>
                )}
              </tr>
              <tr className="border-b" style={{ borderColor: 'var(--color-border-card)' }}>
                <th className="sticky left-0 z-10" style={{ backgroundColor: 'var(--color-bg-card)' }} />
                <th /><th /><th />
                {allStakeholders.map(s => (
                  <th key={s.stakeholderId} className="px-2 py-2 text-center border-l"
                    style={{ borderColor: 'var(--color-border-card)' }}>
                    <div className="text-xs font-medium whitespace-nowrap max-w-[80px] mx-auto truncate"
                      style={{ color: 'var(--color-text-body)' }} title={s.name}>
                      {s.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-[10px] opacity-50 whitespace-nowrap max-w-[80px] mx-auto truncate"
                      style={{ color: 'var(--color-text-body)' }} title={s.name}>
                      {s.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.taskGroups.map(group => {
                const visibleTasks = group.tasks.filter(matchesFilters)
                if (visibleTasks.length === 0 && activeFilterCount > 0) return null
                const isCollapsed = collapsed.has(group.id)
                return (
                  <>
                    <tr key={`g-${group.id}`}
                      className="border-t cursor-pointer select-none theme-group-bg"
                      style={{ borderColor: 'var(--color-border-card)' }}
                      onClick={() => toggleGroup(group.id)}>
                      <td colSpan={4 + allStakeholders.length} className="px-4 py-2">
                        <div className="flex items-center gap-2 font-semibold text-sm theme-group-text">
                          {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                          {group.name}
                          <span className="text-xs font-normal opacity-60 ml-1">
                            ({t.tasks_count(group.tasks.length)})
                          </span>
                        </div>
                      </td>
                    </tr>
                    {!isCollapsed && visibleTasks.map((task, ti) => {
                      const taskRisks = risksForTask[task.id] ?? []
                      const taskIssues = issuesForTask[task.id] ?? []
                      const taskSteps = stepsForTask[task.id] ?? []
                      const effectiveStatus = taskSteps.length > 0 ? deriveTaskStatus(taskSteps) : task.status
                      const stepsDone = taskSteps.filter(s => s.status === 'completed').length
                      const isTaskExpanded = expandedTasks.has(task.id)
                      const rowBg = ti % 2 === 1
                        ? 'color-mix(in srgb, var(--color-bg-card) 90%, var(--color-bg-page))'
                        : 'var(--color-bg-card)'
                      return (
                        <>
                          <tr key={task.id}
                            className="border-t hover:bg-black/5 transition-colors"
                            style={{ borderColor: 'var(--color-border-card)', backgroundColor: rowBg }}>
                            <td className="px-4 py-2.5 sticky left-0 z-10 font-medium"
                              style={{ color: 'var(--color-text-body)', backgroundColor: rowBg }}>
                              <div className="flex items-center gap-2">
                                {task.name}
                                {taskRisks.length > 0 && (
                                  <button
                                    onClick={() => toggleTask(task.id)}
                                    className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full transition-colors flex-shrink-0"
                                    style={{
                                      background: isTaskExpanded ? 'var(--color-primary)' : 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                                      color: isTaskExpanded ? 'white' : 'var(--color-primary)',
                                    }}
                                    title={t.risks}
                                  >
                                    <ShieldAlert size={10} />
                                    {taskRisks.length}
                                  </button>
                                )}
                                {taskIssues.length > 0 && (
                                  <button
                                    onClick={() => toggleTask(task.id)}
                                    className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full transition-colors flex-shrink-0"
                                    style={{
                                      background: isTaskExpanded ? '#f97316' : 'rgb(249 115 22 / 15%)',
                                      color: isTaskExpanded ? 'white' : '#f97316',
                                    }}
                                    title={t.issues}
                                  >
                                    <FileWarning size={10} />
                                    {taskIssues.length}
                                  </button>
                                )}
                                {taskSteps.length > 0 && (
                                  <button
                                    onClick={() => toggleTask(task.id)}
                                    className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full transition-colors flex-shrink-0"
                                    style={{
                                      background: isTaskExpanded ? '#10b981' : 'rgb(16 185 129 / 15%)',
                                      color: isTaskExpanded ? 'white' : '#10b981',
                                    }}
                                    title={t.steps}
                                  >
                                    <ListChecks size={10} />
                                    {t.stepProgress(stepsDone, taskSteps.length)}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[effectiveStatus]}`}>
                                {STATUS_LABELS[effectiveStatus]}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              {task.priority && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
                                  {PRIORITY_LABELS[task.priority]}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-xs opacity-60 whitespace-nowrap" style={{ color: 'var(--color-text-body)' }}>
                              {task.deadline && new Date(task.deadline).toLocaleDateString()}
                            </td>
                            {allStakeholders.map(s => {
                              const roles = assignMap[task.id]?.[s.stakeholderId] ?? []
                              return (
                                <td key={s.stakeholderId} className="px-2 py-2.5 text-center border-l"
                                  style={{ borderColor: 'var(--color-border-card)' }}>
                                  <div className="flex gap-0.5 justify-center flex-wrap">
                                    {roles.map(r => <RoleBadge key={r} role={r} />)}
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                          {isTaskExpanded && taskRisks.length > 0 && (
                            <tr key={`${task.id}-risks`} style={{ borderColor: 'var(--color-border-card)' }}>
                              <td colSpan={4 + allStakeholders.length} className="px-4 py-2"
                                style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 6%, var(--color-bg-card))' }}>
                                <div className="flex flex-wrap gap-2">
                                  {taskRisks.sort((a, b) => b.score - a.score).map(risk => (
                                    <div key={risk.id} className="flex items-center gap-1.5 text-xs rounded-lg px-2 py-1 border"
                                      style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 25%, transparent)', backgroundColor: 'var(--color-bg-card)' }}>
                                      <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${riskScoreColor(risk.score)}`}>
                                        {risk.score}
                                      </span>
                                      <span className="font-medium" style={{ color: 'var(--color-text-body)' }}>{risk.title}</span>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${RISK_STATUS_COLORS[risk.status]}`}>
                                        {RISK_STATUS_LABELS[risk.status]}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                          {isTaskExpanded && taskIssues.length > 0 && (
                            <tr key={`${task.id}-issues`} style={{ borderColor: 'var(--color-border-card)' }}>
                              <td colSpan={4 + allStakeholders.length} className="px-4 py-2"
                                style={{ backgroundColor: 'color-mix(in srgb, #f97316 6%, var(--color-bg-card))' }}>
                                <div className="flex flex-wrap gap-2">
                                  {taskIssues.map(issue => (
                                    <div key={issue.id} className="flex items-center gap-1.5 text-xs rounded-lg px-2 py-1 border"
                                      style={{ borderColor: 'rgb(249 115 22 / 25%)', backgroundColor: 'var(--color-bg-card)' }}>
                                      <FileWarning size={12} className="text-orange-400 flex-shrink-0" />
                                      <span className="font-medium" style={{ color: 'var(--color-text-body)' }}>{issue.title}</span>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ISSUE_STATUS_COLORS[issue.status]}`}>
                                        {ISSUE_STATUS_LABELS[issue.status]}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                          {isTaskExpanded && taskSteps.length > 0 && (
                            <tr key={`${task.id}-steps`} style={{ borderColor: 'var(--color-border-card)' }}>
                              <td colSpan={4 + allStakeholders.length} className="px-4 py-2"
                                style={{ backgroundColor: 'color-mix(in srgb, #10b981 6%, var(--color-bg-card))' }}>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[11px] font-semibold opacity-60 flex items-center gap-1" style={{ color: 'var(--color-text-body)' }}>
                                    <ListChecks size={11} /> {t.steps} ({t.stepProgress(stepsDone, taskSteps.length)})
                                  </span>
                                  <button onClick={() => openStepCreate(task.id)} className="text-[10px] flex items-center gap-0.5 opacity-60 hover:opacity-100" style={{ color: '#10b981' }}>
                                    <Plus size={10} /> {t.stepAdd}
                                  </button>
                                </div>
                                <div className="flex flex-col gap-1">
                                  {taskSteps.map(step => (
                                    <div key={step.id} className="flex items-center gap-2 text-xs group/step">
                                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                        step.status === 'completed' ? 'bg-green-400' :
                                        step.status === 'in_progress' ? 'bg-blue-400' :
                                        step.status === 'blocked' ? 'bg-red-400' : 'bg-gray-300'
                                      }`} />
                                      <span className={`flex-1 ${step.status === 'completed' ? 'line-through opacity-50' : ''}`} style={{ color: 'var(--color-text-body)' }}>{step.name}</span>
                                      <span className="text-[10px] opacity-50" style={{ color: 'var(--color-text-body)' }}>{STATUS_LABELS[step.status]}</span>
                                      <div className="flex gap-0.5 opacity-0 group-hover/step:opacity-100 transition-opacity">
                                        <button onClick={() => openStepEdit(step)} className="btn-ghost p-0.5"><Pencil size={10} /></button>
                                        <button onClick={() => removeStep(step)} className="btn-ghost p-0.5 hover:text-red-600"><Trash2 size={10} /></button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </>
                )
              })}
            </tbody>
          </table>
          {data.taskGroups.every(g => g.tasks.filter(matchesFilters).length === 0) && (
            <div className="text-center py-8 text-sm opacity-50" style={{ color: 'var(--color-text-body)' }}>
              {t.noTasksFiltered}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 card p-4 flex flex-wrap gap-3 items-center">
          <span className="text-xs font-semibold uppercase tracking-wide opacity-50" style={{ color: 'var(--color-text-body)' }}>
            {t.legend}
          </span>
          {(['R', 'A', 'S', 'C', 'I'] as RasciRole[]).map(role => (
            <div key={role} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-body)' }}>
              <RoleBadge role={role} />
              <span>{{ R: 'Responsible', A: 'Accountable', S: 'Support', C: 'Consulted', I: 'Informed' }[role]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: Card view */}
      <div className="md:hidden space-y-4">
        {data.taskGroups.map(group => {
          const visibleTasks = group.tasks.filter(matchesFilters)
          if (visibleTasks.length === 0 && activeFilterCount > 0) return null
          return (
            <div key={group.id}>
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-2 px-1 theme-group-text">
                {group.name}
              </h2>
              <div className="space-y-3">
                {visibleTasks.map(task => {
                  const taskAssigns = data.assignments.filter(a => a.task_id === task.id)
                  const taskRisks = risksForTask[task.id] ?? []
                  const taskIssues = issuesForTask[task.id] ?? []
                  const taskSteps = stepsForTask[task.id] ?? []
                  const effectiveStatus = taskSteps.length > 0 ? deriveTaskStatus(taskSteps) : task.status
                  const stepsDone = taskSteps.filter(s => s.status === 'completed').length
                  return (
                    <div key={task.id} className="card p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-medium" style={{ color: 'var(--color-text-body)' }}>{task.name}</h3>
                        <div className="flex gap-1 flex-shrink-0">
                          {task.priority && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
                              {PRIORITY_LABELS[task.priority]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mb-3 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[effectiveStatus]}`}>
                          {STATUS_LABELS[effectiveStatus]}
                        </span>
                        {task.deadline && (
                          <span className="text-xs opacity-50" style={{ color: 'var(--color-text-body)' }}>
                            📅 {new Date(task.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {taskAssigns.length > 0 && (
                        <div className="border-t pt-3 space-y-1.5" style={{ borderColor: 'var(--color-border-card)' }}>
                          {taskAssigns.map(a => {
                            const stakeholder = allStakeholders.find(s => s.stakeholderId === a.stakeholder_id)
                            if (!stakeholder || a.roles.length === 0) return null
                            return (
                              <div key={a.id} className="flex items-center justify-between gap-2">
                                <span className="text-xs opacity-70" style={{ color: 'var(--color-text-body)' }}>{stakeholder.name}</span>
                                <div className="flex gap-1">
                                  {(a.roles as RasciRole[]).map(r => <RoleBadge key={r} role={r} />)}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {taskRisks.length > 0 && (
                        <div className="border-t pt-3 mt-1" style={{ borderColor: 'var(--color-border-card)' }}>
                          <div className="flex items-center gap-1 mb-2 text-[11px] font-semibold opacity-60" style={{ color: 'var(--color-text-body)' }}>
                            <ShieldAlert size={12} /> {t.risks}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {taskRisks.sort((a, b) => b.score - a.score).map(risk => (
                              <div key={risk.id} className="flex items-center gap-2 text-xs">
                                <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${riskScoreColor(risk.score)}`}>
                                  {risk.score}
                                </span>
                                <span className="flex-1 truncate" style={{ color: 'var(--color-text-body)' }}>{risk.title}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${RISK_STATUS_COLORS[risk.status]}`}>
                                  {RISK_STATUS_LABELS[risk.status]}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {taskIssues.length > 0 && (
                        <div className="border-t pt-3 mt-1" style={{ borderColor: 'var(--color-border-card)' }}>
                          <div className="flex items-center gap-1 mb-2 text-[11px] font-semibold opacity-60" style={{ color: 'var(--color-text-body)' }}>
                            <FileWarning size={12} /> {t.issues}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {taskIssues.map(issue => (
                              <div key={issue.id} className="flex items-center gap-2 text-xs">
                                <span className="flex-1 truncate" style={{ color: 'var(--color-text-body)' }}>{issue.title}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${ISSUE_STATUS_COLORS[issue.status]}`}>
                                  {ISSUE_STATUS_LABELS[issue.status]}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {taskSteps.length > 0 && (
                        <div className="border-t pt-3 mt-1" style={{ borderColor: 'var(--color-border-card)' }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="flex items-center gap-1 text-[11px] font-semibold opacity-60" style={{ color: 'var(--color-text-body)' }}>
                              <ListChecks size={12} /> {t.steps} ({t.stepProgress(stepsDone, taskSteps.length)})
                            </span>
                            <button onClick={() => openStepCreate(task.id)} className="text-[10px]" style={{ color: '#10b981' }}>
                              + {t.stepAdd}
                            </button>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {taskSteps.map(step => (
                              <div key={step.id} className="flex items-center gap-2 text-xs" onClick={() => openStepEdit(step)}>
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  step.status === 'completed' ? 'bg-green-400' :
                                  step.status === 'in_progress' ? 'bg-blue-400' :
                                  step.status === 'blocked' ? 'bg-red-400' : 'bg-gray-300'
                                }`} />
                                <span className={`flex-1 truncate ${step.status === 'completed' ? 'line-through opacity-50' : ''}`} style={{ color: 'var(--color-text-body)' }}>{step.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[step.status]}`}>
                                  {STATUS_LABELS[step.status]}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {stepModal && (
        <Modal title={stepModal.mode === 'create' ? t.stepAdd : t.stepEdit} onClose={() => setStepModal(null)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-body)' }}>{t.stepName}</label>
              <input className="input" value={sName} onChange={e => setSName(e.target.value)} autoFocus
                onKeyDown={e => e.key === 'Enter' && saveStep()} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-body)' }}>{t.stepStatus}</label>
              <select className="input" value={sStatus} onChange={e => setSStatus(e.target.value as TaskStatus)}>
                {STATUS_KEYS.map(k => <option key={k} value={k}>{STATUS_LABELS[k]}</option>)}
              </select>
            </div>
            {stepModal.mode === 'edit' && stepModal.step && (
              <button onClick={() => removeStep(stepModal.step!)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                <Trash2 size={12} /> {t.stepDeleteConfirm(sName)}
              </button>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setStepModal(null)} className="btn-secondary">{t.cancel}</button>
              <button onClick={saveStep} disabled={!sName.trim() || stepSaving} className="btn-primary">
                {stepSaving ? <Spinner size={15} /> : null} {t.save}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
})

DashboardView.displayName = 'DashboardView'
export default DashboardView
