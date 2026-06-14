import { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import type { ProjectFull, Task, TaskGroup, Priority, TaskStatus } from '../../types'
import { PRIORITY_LABELS, STATUS_LABELS, PRIORITY_COLORS, STATUS_COLORS } from '../../types'
import {
  createTaskGroup, updateTaskGroup, deleteTaskGroup,
  createTask, updateTask, deleteTask,
} from '../../lib/db'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'

interface Props { data: ProjectFull; onReload: () => void }

export default function TasksTab({ data, onReload }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [groupModal, setGroupModal] = useState<{ mode: 'create' | 'edit'; group?: TaskGroup } | null>(null)
  const [taskModal, setTaskModal] = useState<{ mode: 'create' | 'edit'; groupId: string; task?: Task } | null>(null)
  const [saving, setSaving] = useState(false)

  const [gName, setGName] = useState('')
  const [tName, setTName] = useState('')
  const [tDeadline, setTDeadline] = useState('')
  const [tPriority, setTPriority] = useState<Priority | ''>('')
  const [tStatus, setTStatus] = useState<TaskStatus>('not_started')

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
      if (groupModal?.mode === 'create') {
        await createTaskGroup(data.project.id, gName.trim(), data.taskGroups.length)
      } else if (groupModal?.group) {
        await updateTaskGroup(groupModal.group.id, gName.trim())
      }
      onReload(); setGroupModal(null)
    } finally { setSaving(false) }
  }

  const removeGroup = async (g: TaskGroup) => {
    if (!confirm(`Usuń grupę „${g.name}" i wszystkie jej zadania?`)) return
    await deleteTaskGroup(g.id); onReload()
  }

  const saveTask = async () => {
    if (!tName.trim() || !taskModal) return
    setSaving(true)
    try {
      if (taskModal.mode === 'create') {
        const group = data.taskGroups.find(g => g.id === taskModal.groupId)
        await createTask(taskModal.groupId, tName.trim(), group?.tasks.length ?? 0)
        if (tDeadline || tPriority || tStatus !== 'not_started') {
          // we need the id — just reload and it will have defaults
        }
      } else if (taskModal.task) {
        await updateTask(taskModal.task.id, {
          name: tName.trim(),
          deadline: tDeadline || null,
          priority: tPriority || null,
          status: tStatus,
        })
      }
      onReload(); setTaskModal(null)
    } finally { setSaving(false) }
  }

  const saveNewTask = async () => {
    if (!tName.trim() || !taskModal) return
    setSaving(true)
    try {
      const group = data.taskGroups.find(g => g.id === taskModal.groupId)
      const task = await createTask(taskModal.groupId, tName.trim(), group?.tasks.length ?? 0)
      if (tDeadline || tPriority || tStatus !== 'not_started') {
        await updateTask(task.id, {
          deadline: tDeadline || null,
          priority: tPriority || null,
          status: tStatus,
        })
      }
      onReload(); setTaskModal(null)
    } finally { setSaving(false) }
  }

  const removeTask = async (task: Task) => {
    if (!confirm(`Usuń zadanie „${task.name}"?`)) return
    await deleteTask(task.id); onReload()
  }

  const toggleGroup = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Grupy zadań i zadania</h2>
        <button onClick={openGroupCreate} className="btn-primary">
          <Plus size={15} /> Nowa grupa
        </button>
      </div>

      {data.taskGroups.length === 0 && (
        <div className="card p-10 text-center text-gray-400">
          Brak grup zadań. Dodaj pierwszą grupę.
        </div>
      )}

      {data.taskGroups.map(group => (
        <div key={group.id} className="card overflow-hidden">
          <div
            className="flex items-center gap-2 px-4 py-3 bg-indigo-50 border-b border-indigo-100 cursor-pointer"
            onClick={() => toggleGroup(group.id)}
          >
            {collapsed.has(group.id) ? <ChevronRight size={16} className="text-indigo-500" /> : <ChevronDown size={16} className="text-indigo-500" />}
            <span className="font-semibold text-indigo-800 flex-1">{group.name}</span>
            <span className="text-xs text-indigo-400">{group.tasks.length} zadań</span>
            <button onClick={e => { e.stopPropagation(); openGroupEdit(group) }} className="btn-ghost p-1 text-gray-500 hover:text-indigo-600">
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
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status]}`}>
                          {STATUS_LABELS[task.status]}
                        </span>
                      )}
                      {task.priority && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                      )}
                      {task.deadline && (
                        <span className="text-xs text-gray-400">
                          📅 {new Date(task.deadline).toLocaleDateString('pl-PL')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openTaskEdit(group.id, task)} className="btn-ghost p-1 text-gray-500 hover:text-indigo-600">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => removeTask(task)} className="btn-ghost p-1 text-gray-500 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="px-4 py-2.5">
                <button
                  onClick={() => openTaskCreate(group.id)}
                  className="btn-ghost text-xs text-indigo-600 hover:text-indigo-800"
                >
                  <Plus size={13} /> Dodaj zadanie
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Group modal */}
      {groupModal && (
        <Modal
          title={groupModal.mode === 'create' ? 'Nowa grupa zadań' : 'Edytuj grupę'}
          onClose={() => setGroupModal(null)}
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa grupy *</label>
              <input className="input" value={gName} onChange={e => setGName(e.target.value)} autoFocus
                onKeyDown={e => e.key === 'Enter' && saveGroup()} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setGroupModal(null)} className="btn-secondary">Anuluj</button>
              <button onClick={saveGroup} disabled={!gName.trim() || saving} className="btn-primary">
                {saving ? <Spinner size={15} /> : null} Zapisz
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Task modal */}
      {taskModal && (
        <Modal
          title={taskModal.mode === 'create' ? 'Nowe zadanie' : 'Edytuj zadanie'}
          onClose={() => setTaskModal(null)}
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa zadania *</label>
              <input className="input" value={tName} onChange={e => setTName(e.target.value)} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priorytet</label>
                <select className="input" value={tPriority} onChange={e => setTPriority(e.target.value as Priority | '')}>
                  <option value="">—</option>
                  {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select className="input" value={tStatus} onChange={e => setTStatus(e.target.value as TaskStatus)}>
                  {(Object.entries(STATUS_LABELS) as [TaskStatus, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Termin</label>
              <input type="date" className="input" value={tDeadline} onChange={e => setTDeadline(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setTaskModal(null)} className="btn-secondary">Anuluj</button>
              <button
                onClick={taskModal.mode === 'create' ? saveNewTask : saveTask}
                disabled={!tName.trim() || saving}
                className="btn-primary"
              >
                {saving ? <Spinner size={15} /> : null} Zapisz
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
