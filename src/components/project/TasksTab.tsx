import { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import type { ProjectFull, Task, TaskGroup, Priority, TaskStatus } from '../../types'
import { createTaskGroup, updateTaskGroup, deleteTaskGroup, createTask, updateTask, deleteTask } from '../../lib/db'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'
import { useT } from '../../lib/i18n'

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
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [groupModal, setGroupModal] = useState<{ mode: 'create' | 'edit'; group?: TaskGroup } | null>(null)
  const [taskModal, setTaskModal] = useState<{ mode: 'create' | 'edit'; groupId: string; task?: Task } | null>(null)
  const [saving, setSaving] = useState(false)
  const [gName, setGName] = useState('')
  const [tName, setTName] = useState('')
  const [tDeadline, setTDeadline] = useState('')
  const [tPriority, setTPriority] = useState<Priority | ''>('')
  const [tStatus, setTStatus] = useState<TaskStatus>('not_started')

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
              {group.tasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 group">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm">{task.name}</div>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {task.status && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status]}`}>{statusLabel(task.status)}</span>
                      )}
                      {task.priority && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority]}`}>{priorityLabel(task.priority)}</span>
                      )}
                      {task.deadline && (
                        <span className="text-xs text-gray-400">📅 {new Date(task.deadline).toLocaleDateString('pl-PL')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openTaskEdit(group.id, task)} className="btn-ghost p-1 text-gray-500"><Pencil size={14} /></button>
                    <button onClick={() => removeTask(task)} className="btn-ghost p-1 text-gray-500 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
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

      {taskModal && (
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.status}</label>
                <select className="input" value={tStatus} onChange={e => setTStatus(e.target.value as TaskStatus)}>
                  {STATUS_KEYS.map(k => <option key={k} value={k}>{statusLabel(k)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.deadline}</label>
              <input type="date" className="input" value={tDeadline} onChange={e => setTDeadline(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setTaskModal(null)} className="btn-secondary">{t.cancel}</button>
              <button onClick={saveTask} disabled={!tName.trim() || saving} className="btn-primary">
                {saving ? <Spinner size={15} /> : null} {t.save}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
