import { useMemo } from 'react'
import Modal from '../ui/Modal'
import type { ProjectFull } from '../../types'
import { CheckCircle, AlertTriangle } from 'lucide-react'

interface Issue {
  type: 'error' | 'warning'
  message: string
}

export default function ValidationModal({ data, onClose }: { data: ProjectFull; onClose: () => void }) {
  const issues = useMemo(() => {
    const result: Issue[] = []
    const allTasks = data.taskGroups.flatMap(g => g.tasks)
    const allStakeholders = data.projectStakeholders

    for (const task of allTasks) {
      const assigns = data.assignments.filter(a => a.task_id === task.id)
      const roles = assigns.flatMap(a => a.roles)

      if (!roles.includes('R')) {
        result.push({ type: 'error', message: `Zadanie „${task.name}" nie ma roli R (Responsible)` })
      }
      if (!roles.includes('A')) {
        result.push({ type: 'warning', message: `Zadanie „${task.name}" nie ma roli A (Accountable)` })
      }
      const rCount = assigns.filter(a => a.roles.includes('R')).length
      if (rCount > 1) {
        result.push({ type: 'warning', message: `Zadanie „${task.name}" ma więcej niż jedną osobę z rolą R` })
      }
      const aCount = assigns.filter(a => a.roles.includes('A')).length
      if (aCount > 1) {
        result.push({ type: 'error', message: `Zadanie „${task.name}" ma więcej niż jedną osobę z rolą A` })
      }
    }

    for (const stakeholder of allStakeholders) {
      const hasAny = data.assignments.some(a => a.stakeholder_id === stakeholder.stakeholderId && a.roles.length > 0)
      if (!hasAny) {
        result.push({ type: 'warning', message: `Stakeholder „${stakeholder.name}" nie ma żadnych przypisanych ról` })
      }
    }

    if (allTasks.length === 0) {
      result.push({ type: 'warning', message: 'Projekt nie ma żadnych zadań' })
    }
    if (allStakeholders.length === 0) {
      result.push({ type: 'warning', message: 'Projekt nie ma żadnych interesariuszy' })
    }

    return result
  }, [data])

  const errors = issues.filter(i => i.type === 'error')
  const warnings = issues.filter(i => i.type === 'warning')

  return (
    <Modal title="Walidacja macierzy RASCI" onClose={onClose} size="md">
      {issues.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-green-600">
          <CheckCircle size={48} />
          <p className="font-medium">Macierz jest poprawnie skonfigurowana!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {errors.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={15} /> Błędy ({errors.length})
              </h3>
              <ul className="space-y-1.5">
                {errors.map((e, i) => (
                  <li key={i} className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {warnings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={15} /> Ostrzeżenia ({warnings.length})
              </h3>
              <ul className="space-y-1.5">
                {warnings.map((w, i) => (
                  <li key={i} className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
