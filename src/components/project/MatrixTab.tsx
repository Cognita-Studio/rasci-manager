import { useState, useMemo } from 'react'
import type { ProjectFull, RasciRole } from '../../types'
import { upsertAssignment } from '../../lib/db'
import RoleSelector from '../ui/RoleSelector'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'
import { useT } from '../../lib/i18n'

interface Props { data: ProjectFull; onReload: () => void }

export default function MatrixTab({ data, onReload }: Props) {
  const { t, lang } = useT()
  const [editing, setEditing] = useState<{ taskId: string; stakeholderId: string } | null>(null)
  const [currentRoles, setCurrentRoles] = useState<RasciRole[]>([])
  const [saving, setSaving] = useState(false)

  const allTasks = data.taskGroups.flatMap(g => g.tasks)
  const allStakeholders = data.projectStakeholders.slice().sort((a, b) => a.order - b.order)

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
      onReload()
      setEditing(null)
    } finally { setSaving(false) }
  }

  if (allTasks.length === 0 || allStakeholders.length === 0) {
    return <div className="card p-10 text-center text-gray-400">{t.matrixEmpty}</div>
  }

  const editingTask = editing ? allTasks.find(t => t.id === editing.taskId) : null
  const editingSt = editing ? allStakeholders.find(s => s.stakeholderId === editing.stakeholderId) : null

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">{t.matrixInstruction}</p>

      {/* Mobile */}
      <div className="md:hidden space-y-4">
        {data.taskGroups.map(group => (
          <div key={group.id}>
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-2 theme-group-text">{group.name}</h3>
            {group.tasks.map(task => (
              <div key={task.id} className="card p-4 mb-3">
                <p className="font-medium text-gray-800 mb-3">{task.name}</p>
                <div className="space-y-2">
                  {allStakeholders.map(s => {
                    const roles = assignMap[task.id]?.[s.stakeholderId] ?? []
                    return (
                      <button
                        key={s.stakeholderId}
                        onClick={() => openEdit(task.id, s.stakeholderId)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-sm text-gray-700">{s.name}</span>
                        <div className="flex gap-1">
                          {roles.length > 0
                            ? roles.map(r => <span key={r} className={`badge-${r}`}>{r}</span>)
                            : <span className="text-xs text-gray-300">—</span>}
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

      {/* Desktop */}
      <div className="hidden md:block card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 min-w-[12rem]">
                {t.task}
              </th>
              {data.stakeholderGroups.map(sg => {
                const count = data.projectStakeholders.filter(s => s.groupId === sg.id).length
                return count > 0 ? (
                  <th key={sg.id} colSpan={count}
                    className="px-2 py-2 text-center text-xs font-semibold text-gray-500 border-l border-gray-200 bg-purple-50">
                    {sg.name}
                  </th>
                ) : null
              })}
            </tr>
            <tr className="border-b border-gray-200">
              <th className="sticky left-0 bg-white z-10" />
              {allStakeholders.map(s => (
                <th key={s.stakeholderId} className="px-2 py-2 text-center border-l border-gray-100">
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
                <tr key={`g-${group.id}`} className="border-t theme-group-bg">
                  <td colSpan={1 + allStakeholders.length} className="px-4 py-2 font-semibold text-sm theme-group-text">
                    {group.name}
                  </td>
                </tr>
                {group.tasks.map(task => (
                  <tr key={task.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 sticky left-0 bg-inherit z-10 font-medium text-gray-800">{task.name}</td>
                    {allStakeholders.map(s => {
                      const roles = assignMap[task.id]?.[s.stakeholderId] ?? []
                      return (
                        <td key={s.stakeholderId} className="px-2 py-2 text-center border-l border-gray-100">
                          <button
                            onClick={() => openEdit(task.id, s.stakeholderId)}
                            className="min-w-[40px] min-h-[32px] flex gap-0.5 justify-center items-center mx-auto rounded hover:bg-gray-100 px-1 py-0.5 transition-colors"
                          >
                            {roles.length > 0
                              ? roles.map(r => <span key={r} className={`badge-${r}`}>{r}</span>)
                              : <span className="text-gray-200 text-xs">—</span>}
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
        <Modal title={t.assignRoles} onClose={() => setEditing(null)} size="sm">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="font-medium text-gray-700">{editingTask.name}</div>
              <div className="text-gray-500 mt-0.5">→ {editingSt.name}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.rolesMultiple}</label>
              <RoleSelector selected={currentRoles} onChange={setCurrentRoles} />
            </div>
            <div className="text-xs text-gray-400 space-y-0.5">
              <div><span className="badge-R mr-1">R</span> Responsible – {lang === 'no' ? 'utfører' : lang === 'en' ? 'executes' : 'wykonuje'}</div>
              <div><span className="badge-A mr-1">A</span> Accountable – {lang === 'no' ? 'ansvarlig' : lang === 'en' ? 'accountable' : 'odpowiada'}</div>
              <div><span className="badge-S mr-1">S</span> Support – {lang === 'no' ? 'støtter' : lang === 'en' ? 'supports' : 'wspiera'}</div>
              <div><span className="badge-C mr-1">C</span> Consulted – {lang === 'no' ? 'konsulteres' : lang === 'en' ? 'consulted' : 'konsultowany'}</div>
              <div><span className="badge-I mr-1">I</span> Informed – {lang === 'no' ? 'informeres' : lang === 'en' ? 'informed' : 'informowany'}</div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setEditing(null)} className="btn-secondary">{t.cancel}</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? <Spinner size={15} /> : null} {t.save}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
