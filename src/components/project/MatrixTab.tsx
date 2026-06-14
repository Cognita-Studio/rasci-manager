import { useState, useMemo } from 'react'
import type { ProjectFull, RasciRole } from '../../types'
import { upsertAssignment } from '../../lib/db'
import RoleSelector from '../ui/RoleSelector'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'

interface Props { data: ProjectFull; onReload: () => void }

export default function MatrixTab({ data, onReload }: Props) {
  const [editing, setEditing] = useState<{ taskId: string; stakeholderId: string } | null>(null)
  const [currentRoles, setCurrentRoles] = useState<RasciRole[]>([])
  const [saving, setSaving] = useState(false)

  const allTasks = data.taskGroups.flatMap(g => g.tasks)
  const allStakeholders = data.stakeholderGroups.flatMap(g => g.stakeholders)

  const assignMap = useMemo(() => {
    const m: Record<string, Record<string, RasciRole[]>> = {}
    for (const a of data.assignments) {
      if (!m[a.task_id]) m[a.task_id] = {}
      m[a.task_id][a.stakeholder_id] = a.roles as RasciRole[]
    }
    return m
  }, [data.assignments])

  const openEdit = (taskId: string, stakeholderId: string) => {
    setCurrentRoles(assignMap[taskId]?.[stakeholderId] ?? [])
    setEditing({ taskId, stakeholderId })
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await upsertAssignment(data.project.id, editing.taskId, editing.stakeholderId, currentRoles)
      onReload(); setEditing(null)
    } finally { setSaving(false) }
  }

  if (allTasks.length === 0 || allStakeholders.length === 0) {
    return (
      <div className="card p-10 text-center text-gray-400">
        Aby edytować macierz, najpierw dodaj zadania i interesariuszy.
      </div>
    )
  }

  const editingTask = editing ? allTasks.find(t => t.id === editing.taskId) : null
  const editingSt = editing ? allStakeholders.find(s => s.id === editing.stakeholderId) : null

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Kliknij w komórkę, aby przypisać role RASCI dla danego interesariusza i zadania.
      </p>

      {/* Mobile: list of tasks with stakeholders */}
      <div className="md:hidden space-y-4">
        {data.taskGroups.map(group => (
          <div key={group.id}>
            <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wide mb-2">{group.name}</h3>
            {group.tasks.map(task => (
              <div key={task.id} className="card p-4 mb-3">
                <p className="font-medium text-gray-800 mb-3">{task.name}</p>
                <div className="space-y-2">
                  {allStakeholders.map(s => {
                    const roles = assignMap[task.id]?.[s.id] ?? []
                    return (
                      <button
                        key={s.id}
                        onClick={() => openEdit(task.id, s.id)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                      >
                        <span className="text-sm text-gray-700">{s.name}</span>
                        <div className="flex gap-1">
                          {roles.length > 0
                            ? roles.map(r => (
                                <span key={r} className={`badge-${r}`}>{r}</span>
                              ))
                            : <span className="text-xs text-gray-300">—</span>
                          }
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Desktop: matrix table */}
      <div className="hidden md:block card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 min-w-[12rem]">
                Zadanie
              </th>
              {data.stakeholderGroups.map(sg => (
                <th
                  key={sg.id}
                  colSpan={sg.stakeholders.length}
                  className="px-2 py-2 text-center text-xs font-semibold text-gray-500 border-l border-gray-200 bg-purple-50"
                >
                  {sg.name}
                </th>
              ))}
            </tr>
            <tr className="border-b border-gray-200">
              <th className="sticky left-0 bg-white z-10" />
              {allStakeholders.map(s => (
                <th key={s.id} className="px-2 py-2 text-center border-l border-gray-100">
                  <div className="text-xs font-medium text-gray-700 whitespace-nowrap max-w-[80px] mx-auto truncate" title={s.name}>
                    {s.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.taskGroups.map(group => (
              <>
                <tr key={`g-${group.id}`} className="bg-indigo-50 border-t border-indigo-100">
                  <td colSpan={1 + allStakeholders.length} className="px-4 py-2 font-semibold text-indigo-700 text-sm">
                    {group.name}
                  </td>
                </tr>
                {group.tasks.map(task => (
                  <tr key={task.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 sticky left-0 bg-inherit z-10 font-medium text-gray-800">
                      {task.name}
                    </td>
                    {allStakeholders.map(s => {
                      const roles = assignMap[task.id]?.[s.id] ?? []
                      return (
                        <td key={s.id} className="px-2 py-2 text-center border-l border-gray-100">
                          <button
                            onClick={() => openEdit(task.id, s.id)}
                            className="min-w-[40px] min-h-[32px] flex gap-0.5 justify-center items-center mx-auto rounded hover:bg-indigo-50 px-1 py-0.5 transition-colors"
                          >
                            {roles.length > 0
                              ? roles.map(r => <span key={r} className={`badge-${r}`}>{r}</span>)
                              : <span className="text-gray-200 text-xs">—</span>
                            }
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {editing && editingTask && editingSt && (
        <Modal title="Przypisz role RASCI" onClose={() => setEditing(null)} size="sm">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="font-medium text-gray-700">{editingTask.name}</div>
              <div className="text-gray-500 mt-0.5">→ {editingSt.name}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role (możesz wybrać wiele)</label>
              <RoleSelector selected={currentRoles} onChange={setCurrentRoles} />
            </div>
            <div className="text-xs text-gray-400 space-y-0.5">
              <div><span className="badge-R mr-1">R</span> Responsible – wykonuje</div>
              <div><span className="badge-A mr-1">A</span> Accountable – odpowiada</div>
              <div><span className="badge-S mr-1">S</span> Support – wspiera</div>
              <div><span className="badge-C mr-1">C</span> Consulted – konsultowany</div>
              <div><span className="badge-I mr-1">I</span> Informed – informowany</div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setEditing(null)} className="btn-secondary">Anuluj</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? <Spinner size={15} /> : null} Zapisz
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
