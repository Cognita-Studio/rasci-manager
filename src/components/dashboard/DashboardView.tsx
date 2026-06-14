import { forwardRef, useState, useMemo } from 'react'
import type { ProjectFull, Priority, TaskStatus, Task } from '../../types'
import { PRIORITY_LABELS, STATUS_LABELS, PRIORITY_COLORS, STATUS_COLORS } from '../../types'
import RoleBadge from '../ui/RoleBadge'
import type { RasciRole } from '../../types'
import { ChevronDown, ChevronRight, Filter, X } from 'lucide-react'

interface Filters {
  priority: Priority | ''
  status: TaskStatus | ''
  deadline: 'overdue' | 'this_week' | 'this_month' | ''
}

interface Props { data: ProjectFull }

const DashboardView = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<Filters>({ priority: '', status: '', deadline: '' })
  const [showFilters, setShowFilters] = useState(false)

  const allStakeholders = data.stakeholderGroups.flatMap(g => g.stakeholders)

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

  const toggleGroup = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const clearFilters = () => setFilters({ priority: '', status: '', deadline: '' })

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary text-xs gap-1.5 ${activeFilterCount > 0 ? 'border-indigo-400 text-indigo-700' : ''}`}
        >
          <Filter size={13} />
          Filtry
          {activeFilterCount > 0 && (
            <span className="bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="btn-ghost text-xs gap-1 text-gray-400">
            <X size={12} /> Wyczyść filtry
          </button>
        )}
        {showFilters && (
          <div className="flex gap-2 flex-wrap items-center">
            <select
              className="input w-auto text-xs py-1.5"
              value={filters.priority}
              onChange={e => setFilters(f => ({ ...f, priority: e.target.value as Priority | '' }))}
            >
              <option value="">Priorytet: Wszystkie</option>
              {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              className="input w-auto text-xs py-1.5"
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value as TaskStatus | '' }))}
            >
              <option value="">Status: Wszystkie</option>
              {(Object.entries(STATUS_LABELS) as [TaskStatus, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              className="input w-auto text-xs py-1.5"
              value={filters.deadline}
              onChange={e => setFilters(f => ({ ...f, deadline: e.target.value as Filters['deadline'] }))}
            >
              <option value="">Termin: Wszystkie</option>
              <option value="overdue">Przeterminowane</option>
              <option value="this_week">Najbliższy tydzień</option>
              <option value="this_month">Najbliższy miesiąc</option>
            </select>
          </div>
        )}
      </div>

      {/* Desktop: Table view */}
      <div className="hidden md:block" ref={ref}>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-64 min-w-[16rem] sticky left-0 bg-gray-50 z-10">
                  Zadanie
                </th>
                <th className="text-left px-3 py-3 font-medium text-gray-500 w-24">Status</th>
                <th className="text-left px-3 py-3 font-medium text-gray-500 w-24">Priorytet</th>
                <th className="text-left px-3 py-3 font-medium text-gray-500 w-24">Termin</th>
                {data.stakeholderGroups.map(sg => (
                  <>
                    <th
                      key={`sg-${sg.id}`}
                      colSpan={sg.stakeholders.length}
                      className="px-2 py-2 text-center text-xs font-semibold text-gray-500 border-l border-gray-200 bg-indigo-50"
                    >
                      {sg.name}
                    </th>
                  </>
                ))}
              </tr>
              <tr className="border-b border-gray-200">
                <th className="sticky left-0 bg-white z-10" />
                <th /><th /><th />
                {data.stakeholderGroups.flatMap(sg =>
                  sg.stakeholders.map(s => (
                    <th key={s.id} className="px-2 py-2 text-center border-l border-gray-100">
                      <div className="text-xs font-medium text-gray-700 whitespace-nowrap max-w-[80px] mx-auto truncate" title={s.name}>
                        {s.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="text-[10px] text-gray-400 whitespace-nowrap max-w-[80px] mx-auto truncate" title={s.name}>
                        {s.name}
                      </div>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {data.taskGroups.map(group => {
                const visibleTasks = group.tasks.filter(matchesFilters)
                if (visibleTasks.length === 0 && activeFilterCount > 0) return null
                const isCollapsed = collapsed.has(group.id)
                return (
                  <>
                    <tr
                      key={`g-${group.id}`}
                      className="bg-indigo-50 border-t border-indigo-100 cursor-pointer select-none"
                      onClick={() => toggleGroup(group.id)}
                    >
                      <td colSpan={4 + allStakeholders.length} className="px-4 py-2">
                        <div className="flex items-center gap-2 font-semibold text-indigo-800 text-sm">
                          {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                          {group.name}
                          <span className="text-xs font-normal text-indigo-400 ml-1">
                            ({group.tasks.length} {group.tasks.length === 1 ? 'zadanie' : 'zadań'})
                          </span>
                        </div>
                      </td>
                    </tr>
                    {!isCollapsed && visibleTasks.map((task, ti) => (
                      <tr
                        key={task.id}
                        className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${ti % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                      >
                        <td className="px-4 py-2.5 sticky left-0 bg-inherit z-10 font-medium text-gray-800">
                          {task.name}
                        </td>
                        <td className="px-3 py-2.5">
                          {task.status && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status]}`}>
                              {STATUS_LABELS[task.status]}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {task.priority && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
                              {PRIORITY_LABELS[task.priority]}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                          {task.deadline && new Date(task.deadline).toLocaleDateString('pl-PL')}
                        </td>
                        {allStakeholders.map(s => {
                          const roles = assignMap[task.id]?.[s.id] ?? []
                          return (
                            <td key={s.id} className="px-2 py-2.5 text-center border-l border-gray-100">
                              <div className="flex gap-0.5 justify-center flex-wrap">
                                {roles.map(r => <RoleBadge key={r} role={r} />)}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </>
                )
              })}
            </tbody>
          </table>
          {data.taskGroups.every(g => g.tasks.filter(matchesFilters).length === 0) && (
            <div className="text-center py-8 text-gray-400 text-sm">
              Brak zadań spełniających kryteria filtrów.
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 card p-4 flex flex-wrap gap-3 items-center">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Legenda:</span>
          {(['R', 'A', 'S', 'C', 'I'] as RasciRole[]).map(role => (
            <div key={role} className="flex items-center gap-1.5 text-xs text-gray-600">
              <RoleBadge role={role} />
              <span>{{
                R: 'Responsible',
                A: 'Accountable',
                S: 'Support',
                C: 'Consulted',
                I: 'Informed',
              }[role]}</span>
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
              <h2 className="text-sm font-semibold text-indigo-700 uppercase tracking-wide mb-2 px-1">
                {group.name}
              </h2>
              <div className="space-y-3">
                {visibleTasks.map(task => {
                  const taskAssigns = data.assignments.filter(a => a.task_id === task.id)
                  return (
                    <div key={task.id} className="card p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-medium text-gray-900">{task.name}</h3>
                        <div className="flex gap-1 flex-shrink-0">
                          {task.priority && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
                              {PRIORITY_LABELS[task.priority]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mb-3 flex-wrap">
                        {task.status && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status]}`}>
                            {STATUS_LABELS[task.status]}
                          </span>
                        )}
                        {task.deadline && (
                          <span className="text-xs text-gray-400">
                            📅 {new Date(task.deadline).toLocaleDateString('pl-PL')}
                          </span>
                        )}
                      </div>
                      {taskAssigns.length > 0 && (
                        <div className="border-t border-gray-100 pt-3 space-y-1.5">
                          {taskAssigns.map(a => {
                            const stakeholder = allStakeholders.find(s => s.id === a.stakeholder_id)
                            if (!stakeholder || a.roles.length === 0) return null
                            return (
                              <div key={a.id} className="flex items-center justify-between gap-2">
                                <span className="text-xs text-gray-600">{stakeholder.name}</span>
                                <div className="flex gap-1">
                                  {(a.roles as RasciRole[]).map(r => <RoleBadge key={r} role={r} />)}
                                </div>
                              </div>
                            )
                          })}
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
    </div>
  )
})

DashboardView.displayName = 'DashboardView'
export default DashboardView
