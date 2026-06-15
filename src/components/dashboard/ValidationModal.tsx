import { useMemo } from 'react'
import Modal from '../ui/Modal'
import type { ProjectFull } from '../../types'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { useT } from '../../lib/i18n'

interface Issue { type: 'error' | 'warning'; message: string }

export default function ValidationModal({ data, onClose }: { data: ProjectFull; onClose: () => void }) {
  const { t } = useT()

  const issues = useMemo(() => {
    const result: Issue[] = []
    const allTasks = data.taskGroups.flatMap(g => g.tasks)
    const allStakeholders = data.projectStakeholders

    for (const task of allTasks) {
      const assigns = data.assignments.filter(a => a.task_id === task.id)
      const roles = assigns.flatMap(a => a.roles)
      if (!roles.includes('R')) result.push({ type: 'error', message: t.errNoR(task.name) })
      if (!roles.includes('A')) result.push({ type: 'warning', message: t.errNoA(task.name) })
      if (assigns.filter(a => a.roles.includes('R')).length > 1) result.push({ type: 'warning', message: t.errMultiR(task.name) })
      if (assigns.filter(a => a.roles.includes('A')).length > 1) result.push({ type: 'error', message: t.errMultiA(task.name) })
    }

    for (const s of allStakeholders) {
      const hasAny = data.assignments.some(a => a.stakeholder_id === s.stakeholderId && a.roles.length > 0)
      if (!hasAny) result.push({ type: 'warning', message: t.errNoRole(s.name) })
    }

    if (allTasks.length === 0) result.push({ type: 'warning', message: t.errNoTasks })
    if (allStakeholders.length === 0) result.push({ type: 'warning', message: t.errNoStakeholders })

    return result
  }, [data, t])

  const errors = issues.filter(i => i.type === 'error')
  const warnings = issues.filter(i => i.type === 'warning')

  return (
    <Modal title={t.validationTitle} onClose={onClose} size="md">
      {issues.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-green-600">
          <CheckCircle size={48} />
          <p className="font-medium">{t.validationOk}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {errors.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={15} /> {t.errors} ({errors.length})
              </h3>
              <ul className="space-y-1.5">
                {errors.map((e, i) => (
                  <li key={i} className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{e.message}</li>
                ))}
              </ul>
            </div>
          )}
          {warnings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={15} /> {t.warnings} ({warnings.length})
              </h3>
              <ul className="space-y-1.5">
                {warnings.map((w, i) => (
                  <li key={i} className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{w.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
