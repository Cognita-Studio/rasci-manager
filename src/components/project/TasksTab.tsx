import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, ListChecks } from 'lucide-react'
import type { ProjectFull, Task, TaskGroup, TaskStep, Priority, TaskStatus } from '../../types'
import { deriveTaskStatus } from '../../types'
import { createTaskGroup, updateTaskGroup, deleteTaskGroup, createTask, updateTask, deleteTask, createStep, updateStep, deleteStep, syncTaskStatusFromSteps } from '../../lib/db'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'
import { useT, useTranslatedLabels } from '../../lib/i18n'

interface Props { data: ProjectFull; onReload: () => void }

const PRIORITY_KEYS: Priority[] = ['critical', 'high', 'medium', 'low']
const STATUS_KEYS: TaskStatus[] = ['not_started', 'in_progress', 'blocked', 'completed']

const PRIORITY_COLORS: Record<Priority, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-600',
}
const STATUS_COLORS: Record<TaskStatus, string> = {
  not_started: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-800',
  blocked: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
}

export default function TasksTab({ data, onReload }: Props) {
  const { t } = useT()
  const { STATUS_LABELS } = useTranslatedLabels()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [groupModal, setGroupModal] = useState<{ mode: 'create' | 'edit'; group?: TaskGroup } | null>(null)
  const [taskModal, setTaskModal] = useState<{ mode: 'create' | 'edit'; groupId: string; task?: Task } | null>(null)
  const [saving, setSaving] = useState(false)
  const [stepSaving, setStepSaving] = useState(false)
  const [gName, setGName] = useState('')
  const [tName, setTName] = useState('')
  const [tDeadline, setTDeadline] = useState('')
  const [tPriority, setTPriority] = useState<Priority | ''>('')
  const [tStatus, setTStatus] = useState<TaskStatus>('not_started')
  const [stepModal, setStepModal] = useState<{ mode: 'create' | 'edit'; taskId: string; step?: TaskStep } | null>(null)
  const [sName, setSName] = useState('')
  const [sStatus, setSStatus] = useState<TaskStatus>('not_started')

  const stepsForTask = useMemo(() => {
    const m: Record<string, TaskStep[]> = {}
    for (const s of data.steps) (m[s.task_id] ??= []).push(s)
    return m
  }, [data.steps])

  const priorityLabel = (k: Priority) => ({ critical: t.priorityCritical, high: t.priorityHigh, medium: t.priorityMedium, low: t.priorityLow }[k])
  const statusLabel = (k: TaskStatus) => ({ not_started: t.statusNotStarted, in_progress: t.statusInProgress, blocked: t.statusBlocked, completed: t.statusCompleted }[k])

  const openGroupCreate = () => { setGName(''); setGroupModal({ mode: 'create' }) }
  const openGroupEdit = (g: TaskGroup) => { setGName(g.name); setGroupModal({ mode: 'edit', group: g }) }
  const openTaskCreate = (groupId: string) => {
    setTName(''); setTDeadline(''); setTPriority(''); setTStatus('not_started')
    setTaskModal({ mode: 'create', groupId })
  }
  const openTaskEdit = (groupId: string, task: Task) => {
    setTName(task.name); setTDeadline(task.deadline ?? ''); setTPriority(task.priority ?? ''); setTStatus(task.status)
    setTaskModal({ mode: 'edit', groupId, task })
  }

  const saveGroup = async () => {
    if (!gName.trim()) return
    setSaving(true)
    try {
      if (groupModal?.mode === 'create') await createTaskGroup(data.project.id, gName.trim(), data.taskGroups.length)
      else if (groupModal?.group) await updateTaskGroup(groupModal.group.id, gName.trim())
      onReload(); setGroupModal(null)
    } finally { setSaving(false) }
  }

  const removeGroup = async (g: TaskGroup) => {
    if (!confirm(t.deleteGroupConfirm(g.name))) return
    await deleteTaskGroup(g.id); onReload()
  }

  const saveTask = async () => {
    if (!tName.trim() || !taskModal) return
    setSaving(true)
    try {
      if (taskModal.mode === 'create') {
        const group = data.taskGroups.find(g => g.id === taskModal.groupId)
        const task = await createTask(taskModal.groupId, tName.trim(), group?.tasks.length ?? 0)
        if (tDeadline || tPriority || tStatus !== 'not_started') {
          await updateTask(task.id, { deadline: tDeadline || null, priority: tPriority || null, status: tStatus })
        }
      } else if (taskModal.task) {
        await updateTask(taskModal.task.id, {
          name: tName.trim(), deadline: tDeadline || null, priority: tPriority || null, status: tStatus,
        })
      }
      onReload(); setTaskModal(null)
    } finally { setSaving(false) }
  }

  const removeTask = async (task: Task) => {
    if (!confirm(t.deleteTaskConfirm(task.name))) return
    await deleteTask(task.id); onReload()
  }

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

  const toggleGroup = (id: string) => {
    setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">{t.taskGroups}</h2>
        <button onClick={openGroupCreate} className="btn-primary"><Plus size={15} /> {t.newGroup}</button>
      </div>

      {data.taskGroups.length === 0 && (
        <div className="card p-10 text-center text-gray-400">{t.noGroups}</div>
      )}

      {data.taskGroups.map(group => (
        <div key={group.id} className="card overflow-hidden">
          <div
            className="flex items-center gap-2 px-4 py-3 border-b cursor-pointer theme-group-bg theme-group-border"
            onClick={() => toggleGroup(group.id)}
          >
            {collapsed.has(group.id)
              ? <ChevronRight size={16} style={{ color: 'var(--color-primary)' }} />
              : <ChevronDown size={16} style={{ color: 'var(--color-primary)' }} />
            }
            <span className="font-semibold flex-1 theme-group-text">{group.name}</span>
            <span className="text-xs opacity-60 theme-group-text">{t.tasks_count(group.tasks.length)}</span>
            <button onClick={e => { e.stopPropagation(); openGroupEdit(group) }} className="btn-ghost p-1 text-gray-500">
              <Pencil size={14} />
            </button>
            <button onClick={e => { e.stopPropagation(); removeGroup(group) }} className="btn-ghost p-1 text-gray-500 hover:text-red-600">
              <Trash2 size={14} />
            </button>
          </div>

          {!collapsed.has(group.id) && (
            <div>
              {group.tasks.map(task => {
                const steps = stepsForTask[task.id] ?? []
                const doneCount = steps.filter(s => s.status === 'completed').length
                const effectiveStatus = steps.length > 0 ? deriveTaskStatus(steps) : task.status
                return (
                  <div key={task.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 group">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 text-sm">{task.name}</div>
                      <div className="flex gap-2 mt-1 flex-wrap items-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[effectiveStatus]}`}>{statusLabel(effectiveStatus)}</span>
                        {task.priority && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority]}`}>{priorityLabel(task.priority)}</span>
                        )}
                        {task.deadline && (
                          <span className="text-xs text-gray-400">📅 {new Date(task.deadline).toLocaleDateString()}</span>
                        )}
                        {steps.length > 0 && (
                          <span className="text-xs flex items-center gap-1 opacity-60" style={{ color: 'var(--color-text-body)' }}>
                            <ListChecks size={11} /> {t.stepProgress(doneCount, steps.length)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openTaskEdit(group.id, task)} className="btn-ghost p-1 text-gray-500"><Pencil size={14} /></button>
                      <button onClick={() => removeTask(task)} className="btn-ghost p-1 text-gray-500 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </div>
                )
              })}
              <div className="px-4 py-2.5">
                <button onClick={() => openTaskCreate(group.id)} className="btn-ghost text-xs" style={{ color: 'var(--color-primary)' }}>
                  <Plus size={13} /> {t.addTask}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {groupModal && (
        <Modal title={groupModal.mode === 'create' ? t.newGroupTitle : t.editGroup} onClose={() => setGroupModal(null)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.groupName} *</label>
              <input className="input" value={gName} onChange={e => setGName(e.target.value)} autoFocus
                onKeyDown={e => e.key === 'Enter' && saveGroup()} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setGroupModal(null)} className="btn-secondary">{t.cancel}</button>
              <button onClick={saveGroup} disabled={!gName.trim() || saving} className="btn-primary">
                {saving ? <Spinner size={15} /> : null} {t.save}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {taskModal && (() => {
        const taskSteps = taskModal.task ? (stepsForTask[taskModal.task.id] ?? []) : []
        const hasSteps = taskSteps.length > 0
        return (
          <Modal title={taskModal.mode === 'create' ? t.newTask : t.editTask} onClose={() => setTaskModal(null)} size="sm">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.taskName} *</label>
                <input className="input" value={tName} onChange={e => setTName(e.target.value)} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.priority}</label>
                  <select className="input" value={tPriority} onChange={e => setTPriority(e.target.value as Priority | '')}>
                    <option value="">—</option>
                    {PRIORITY_KEYS.map(k => <option key={k} value={k}>{priorityLabel(k)}</option>)}
                  </select>
                </div>
                {!hasSteps && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.status}</label>
                    <select className="input" value={tStatus} onChange={e => setTStatus(e.target.value as TaskStatus)}>
                      {STATUS_KEYS.map(k => <option key={k} value={k}>{statusLabel(k)}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.deadline}</label>
                <input type="date" className="input" value={tDeadline} onChange={e => setTDeadline(e.target.value)} />
              </div>

              {/* Steps section — only in edit mode */}
              {taskModal.mode === 'edit' && taskModal.task && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <ListChecks size={14} /> {t.steps}
                      {hasSteps && <span className="text-xs opacity-50">({t.stepProgress(taskSteps.filter(s => s.status === 'completed').length, taskSteps.length)})</span>}
                    </label>
                    <button onClick={() => openStepCreate(taskModal.task!.id)} className="btn-ghost text-xs" style={{ color: 'var(--color-primary)' }}>
                      <Plus size={12} /> {t.stepAdd}
                    </button>
                  </div>
                  {taskSteps.length === 0 ? (
                    <p className="text-xs opacity-40 py-2 text-center" style={{ color: 'var(--color-text-body)' }}>{t.stepNone}</p>
                  ) : (
                    <div className="border rounded-lg divide-y overflow-hidden" style={{ borderColor: 'var(--color-border-card)' }}>
                      {taskSteps.map(step => (
                        <div key={step.id} className="flex items-center gap-2 px-3 py-2 hover:bg-black/5 group">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            step.status === 'completed' ? 'bg-green-400' :
                            step.status === 'in_progress' ? 'bg-blue-400' :
                            step.status === 'blocked' ? 'bg-red-400' : 'bg-gray-300'
                          }`} />
                          <span className="flex-1 text-sm truncate" style={{ color: 'var(--color-text-body)' }}>{step.name}</span>
                          <span className="text-xs opacity-50 flex-shrink-0" style={{ color: 'var(--color-text-body)' }}>
                            {STATUS_LABELS[step.status]}
                          </span>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openStepEdit(step)} className="btn-ghost p-1"><Pencil size={11} /></button>
                            <button onClick={() => removeStep(step)} className="btn-ghost p-1 hover:text-red-600"><Trash2 size={11} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button onClick={() => setTaskModal(null)} className="btn-secondary">{t.cancel}</button>
                <button onClick={saveTask} disabled={!tName.trim() || saving} className="btn-primary">
                  {saving ? <Spinner size={15} /> : null} {t.save}
                </button>
              </div>
            </div>
          </Modal>
        )
      })()}

      {stepModal && (
        <Modal title={stepModal.mode === 'create' ? t.stepAdd : t.stepEdit} onClose={() => setStepModal(null)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.stepName}</label>
              <input className="input" value={sName} onChange={e => setSName(e.target.value)} autoFocus
                onKeyDown={e => e.key === 'Enter' && saveStep()} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.stepStatus}</label>
              <select className="input" value={sStatus} onChange={e => setSStatus(e.target.value as TaskStatus)}>
                {STATUS_KEYS.map(k => <option key={k} value={k}>{statusLabel(k)}</option>)}
              </select>
            </div>
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
}
