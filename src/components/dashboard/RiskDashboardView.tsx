import { forwardRef, useState, useMemo } from 'react'
import type { ProjectFull, Risk, RiskStatus } from '../../types'
import { RISK_STATUS_LABELS, RISK_STATUS_COLORS, riskScoreColor, riskScoreLabel } from '../../types'
import { Link2 } from 'lucide-react'
import { useT } from '../../lib/i18n'

function cellColor(score: number) {
  if (score >= 17) return 'bg-red-500'
  if (score >= 10) return 'bg-orange-400'
  if (score >= 5)  return 'bg-yellow-300'
  return 'bg-green-400'
}
function cellTextColor(score: number) {
  return score >= 5 ? 'text-white' : 'text-gray-800'
}

interface Props { data: ProjectFull }

const RiskDashboardView = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const { t } = useT()
  const [statusFilter, setStatusFilter] = useState<RiskStatus | ''>('')
  const [catFilter, setCatFilter] = useState('')
  const [selectedCell, setSelectedCell] = useState<{ p: number; i: number } | null>(null)
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null)

  const allTasks = data.taskGroups.flatMap(g => g.tasks)

  const P_LABELS = ['', t.riskProbVeryLow, t.riskProbLow, t.riskProbMedium, t.riskProbHigh, t.riskProbVeryHigh]
  const I_LABELS = ['', t.riskImpactNegligible, t.riskImpactMinor, t.riskImpactModerate, t.riskImpactMajor, t.riskImpactCritical]

  const filteredRisks = useMemo(() => data.risks.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false
    if (catFilter && r.category_id !== catFilter) return false
    return true
  }), [data.risks, statusFilter, catFilter])

  const getRisksInCell = (p: number, i: number) =>
    filteredRisks.filter(r => r.probability === p && r.impact === i)

  const getCategoryColor = (catId: string | null) =>
    catId ? (data.riskCategories.find(c => c.id === catId)?.color ?? '#6b7280') : '#6b7280'
  const getCategoryName = (catId: string | null) =>
    catId ? (data.riskCategories.find(c => c.id === catId)?.name ?? '') : ''
  const getOwner = (ownerId: string | null) =>
    ownerId ? (data.projectStakeholders.find(s => s.stakeholderId === ownerId)?.name ?? '—') : '—'
  const getLinkedTasks = (riskId: string) =>
    data.riskTaskLinks.filter(l => l.risk_id === riskId).map(l => allTasks.find(t => t.id === l.task_id)).filter(Boolean)

  const cellRisks = selectedCell ? getRisksInCell(selectedCell.p, selectedCell.i) : []

  if (data.risks.length === 0) {
    return (
      <div className="card p-12 text-center" style={{ color: 'var(--color-text-body)', opacity: 0.6 }}>
        {t.riskNoData}
      </div>
    )
  }

  return (
    <div ref={ref} className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select className="input w-auto text-xs py-1.5" value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as RiskStatus | '')}>
          <option value="">{t.riskStatusAll}</option>
          {Object.entries(RISK_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input w-auto text-xs py-1.5" value={catFilter}
          onChange={e => setCatFilter(e.target.value)}>
          <option value="">{t.riskCategoryAll}</option>
          {data.riskCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {(statusFilter || catFilter) && (
          <button onClick={() => { setStatusFilter(''); setCatFilter('') }}
            className="btn-ghost text-xs" style={{ opacity: 0.6 }}>✕ {t.clearFilters}</button>
        )}
      </div>

      {/* Heatmap */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-body)' }}>
          {t.riskHeatmapTitle}
        </h3>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="flex ml-14 mb-1">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex-1 min-w-[60px] text-center text-xs font-medium px-1"
                  style={{ color: 'var(--color-text-body)', opacity: 0.7 }}>
                  {I_LABELS[i]}
                </div>
              ))}
            </div>
            {[5,4,3,2,1].map(p => (
              <div key={p} className="flex items-stretch mb-1">
                <div className="w-14 flex-shrink-0 flex items-center justify-center text-xs font-medium pr-2 text-right leading-tight"
                  style={{ color: 'var(--color-text-body)', opacity: 0.7 }}>
                  {P_LABELS[p].split('\n').map((l, i) => <span key={i} className="block">{l}</span>)}
                </div>
                {[1,2,3,4,5].map(i => {
                  const score = p * i
                  const risks = getRisksInCell(p, i)
                  const isSelected = selectedCell?.p === p && selectedCell?.i === i
                  return (
                    <button key={i}
                      onClick={() => setSelectedCell(prev => prev?.p === p && prev?.i === i ? null : { p, i })}
                      className={`flex-1 min-w-[60px] min-h-[56px] rounded mx-0.5 relative transition-all
                        ${cellColor(score)} ${cellTextColor(score)}
                        ${isSelected ? 'ring-2 ring-gray-800 ring-offset-1 scale-105' : 'hover:brightness-90'}`}
                    >
                      <div className="text-[10px] opacity-60 absolute top-1 left-1.5">{score}</div>
                      {risks.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 justify-center p-1 pt-4">
                          {risks.slice(0, 4).map(r => (
                            <div key={r.id} className="w-5 h-5 rounded-full bg-white/80 text-gray-800
                              flex items-center justify-center text-[9px] font-bold shadow-sm" title={r.title}>
                              {r.title[0].toUpperCase()}
                            </div>
                          ))}
                          {risks.length > 4 && (
                            <div className="w-5 h-5 rounded-full bg-white/80 text-gray-800 flex items-center justify-center text-[9px] font-bold">
                              +{risks.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
            <div className="ml-14 text-center text-xs mt-2" style={{ color: 'var(--color-text-body)', opacity: 0.5 }}>
              {t.riskImpactAxis}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-3 flex-wrap">
          {[
            { s: 1,  l: t.riskLegendLow },
            { s: 5,  l: t.riskLegendMedium },
            { s: 10, l: t.riskLegendHigh },
            { s: 17, l: t.riskLegendCritical },
          ].map(({ s, l }) => (
            <div key={s} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-body)' }}>
              <div className={`w-3 h-3 rounded ${cellColor(s)}`} />
              {l}
            </div>
          ))}
        </div>
      </div>

      {/* Selected cell risks */}
      {selectedCell && cellRisks.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-body)' }}>
            {t.riskCellTitle(selectedCell.p, selectedCell.i, selectedCell.p * selectedCell.i)}
          </h3>
          <div className="space-y-2">
            {cellRisks.map(r => (
              <button key={r.id} onClick={() => setSelectedRisk(r === selectedRisk ? null : r)}
                className="w-full text-left card p-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${riskScoreColor(r.score)}`}>{r.score}</span>
                  <span className="font-medium text-sm flex-1" style={{ color: 'var(--color-text-body)' }}>{r.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_STATUS_COLORS[r.status]}`}>{RISK_STATUS_LABELS[r.status]}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Risk list */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center" style={{ borderColor: 'var(--color-border-card)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-body)' }}>
            {t.riskListTitle(filteredRisks.length)}
          </h3>
        </div>
        {filteredRisks.length === 0 ? (
          <p className="text-center py-6 text-sm" style={{ color: 'var(--color-text-body)', opacity: 0.5 }}>{t.riskNoFiltered}</p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border-card)' }}>
            {filteredRisks.sort((a, b) => b.score - a.score).map(r => {
              const isOpen = selectedRisk?.id === r.id
              const linkedTasks = getLinkedTasks(r.id)
              return (
                <div key={r.id} style={{ borderColor: 'var(--color-border-card)' }}>
                  <button onClick={() => setSelectedRisk(isOpen ? null : r)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-black/5 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${riskScoreColor(r.score)}`}>
                      {r.score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate" style={{ color: 'var(--color-text-body)' }}>{r.title}</div>
                      <div className="flex gap-2 flex-wrap mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${RISK_STATUS_COLORS[r.status]}`}>
                          {RISK_STATUS_LABELS[r.status]}
                        </span>
                        {r.category_id && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full text-white"
                            style={{ background: getCategoryColor(r.category_id) }}>
                            {getCategoryName(r.category_id)}
                          </span>
                        )}
                        <span className="text-xs opacity-50" style={{ color: 'var(--color-text-body)' }}>
                          P:{r.probability} × I:{r.impact}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs flex-shrink-0 hidden sm:block opacity-60" style={{ color: 'var(--color-text-body)' }}>
                      {riskScoreLabel(r.score)}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-4 py-3 border-t text-xs grid grid-cols-2 gap-2"
                      style={{ borderColor: 'var(--color-border-card)', backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 85%, var(--color-bg-page))' }}>
                      <div>
                        <span className="opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.riskOwner}</span><br />
                        <b style={{ color: 'var(--color-text-body)' }}>{getOwner(r.owner_id)}</b>
                      </div>
                      {r.review_deadline && (
                        <div>
                          <span className="opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.riskReviewDate}</span><br />
                          <b style={{ color: 'var(--color-text-body)' }}>{new Date(r.review_deadline).toLocaleDateString()}</b>
                        </div>
                      )}
                      {r.description && (
                        <div className="col-span-2">
                          <span className="opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.riskDescription}</span><br />
                          <span style={{ color: 'var(--color-text-body)' }}>{r.description}</span>
                        </div>
                      )}
                      {r.mitigation_plan && (
                        <div className="col-span-2">
                          <span className="opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.riskMitigationPlan}</span><br />
                          <span style={{ color: 'var(--color-text-body)' }}>{r.mitigation_plan}</span>
                        </div>
                      )}
                      {linkedTasks.length > 0 && (
                        <div className="col-span-2">
                          <span className="opacity-50 flex items-center gap-1 mb-1" style={{ color: 'var(--color-text-body)' }}>
                            <Link2 size={11} /> {t.riskLinkedTasks}
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
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
})

RiskDashboardView.displayName = 'RiskDashboardView'
export default RiskDashboardView
