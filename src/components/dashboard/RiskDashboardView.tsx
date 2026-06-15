import { forwardRef, useState, useMemo } from 'react'
import type { ProjectFull, Risk, RiskStatus } from '../../types'
import { RISK_STATUS_LABELS, RISK_STATUS_COLORS, riskScoreColor, riskScoreLabel } from '../../types'
import { Link2 } from 'lucide-react'

const P_LABELS = ['', 'Bardzo\nniskie', 'Niskie', 'Średnie', 'Wysokie', 'Bardzo\nwysokie']
const I_LABELS = ['', 'Pomijalny', 'Nieznaczny', 'Umiarkowany', 'Poważny', 'Krytyczny']

function cellScore(p: number, i: number) { return p * i }
function cellColor(score: number) {
  if (score >= 17) return 'bg-red-500'
  if (score >= 10) return 'bg-orange-400'
  if (score >= 5)  return 'bg-yellow-300'
  return 'bg-green-400'
}
function cellTextColor(score: number) {
  if (score >= 5) return 'text-white'
  return 'text-gray-800'
}

interface Props { data: ProjectFull }

const RiskDashboardView = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const [statusFilter, setStatusFilter] = useState<RiskStatus | ''>('')
  const [catFilter, setCatFilter] = useState('')
  const [selectedCell, setSelectedCell] = useState<{ p: number; i: number } | null>(null)
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null)

  const allTasks = data.taskGroups.flatMap(g => g.tasks)

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
      <div className="card p-12 text-center text-gray-400">
        Brak zarejestrowanych ryzyk. Przejdź do Edytora → Ryzyka, aby dodać pierwsze.
      </div>
    )
  }

  return (
    <div ref={ref} className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select className="input w-auto text-xs py-1.5" value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as RiskStatus | '')}>
          <option value="">Status: Wszystkie</option>
          {Object.entries(RISK_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input w-auto text-xs py-1.5" value={catFilter}
          onChange={e => setCatFilter(e.target.value)}>
          <option value="">Kategoria: Wszystkie</option>
          {data.riskCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {(statusFilter || catFilter) && (
          <button onClick={() => { setStatusFilter(''); setCatFilter('') }}
            className="btn-ghost text-xs text-gray-400">✕ Wyczyść</button>
        )}
      </div>

      {/* Heatmap */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Macierz ryzyk (Prawdopodobieństwo × Wpływ)</h3>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Impact axis header */}
            <div className="flex ml-14 mb-1">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex-1 min-w-[60px] text-center text-xs text-gray-500 font-medium px-1">
                  {I_LABELS[i]}
                </div>
              ))}
            </div>
            {/* Grid rows (probability high→low) */}
            {[5,4,3,2,1].map(p => (
              <div key={p} className="flex items-stretch mb-1">
                <div className="w-14 flex-shrink-0 flex items-center justify-center text-xs text-gray-500 font-medium pr-2 text-right leading-tight">
                  {P_LABELS[p].split('\n').map((l, i) => <span key={i} className="block">{l}</span>)}
                </div>
                {[1,2,3,4,5].map(i => {
                  const score = cellScore(p, i)
                  const risks = getRisksInCell(p, i)
                  const isSelected = selectedCell?.p === p && selectedCell?.i === i
                  return (
                    <button key={i}
                      onClick={() => setSelectedCell(prev => prev?.p === p && prev?.i === i ? null : { p, i })}
                      className={`flex-1 min-w-[60px] min-h-[56px] rounded mx-0.5 relative transition-all
                        ${cellColor(score)} ${cellTextColor(score)}
                        ${isSelected ? 'ring-2 ring-gray-800 ring-offset-1 scale-105' : 'hover:scale-102 hover:brightness-90'}`}
                    >
                      <div className="text-[10px] opacity-60 absolute top-1 left-1.5">{score}</div>
                      {risks.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 justify-center p-1 pt-4">
                          {risks.slice(0, 4).map(r => (
                            <div key={r.id} className="w-5 h-5 rounded-full bg-white/80 text-gray-800
                              flex items-center justify-center text-[9px] font-bold shadow-sm"
                              title={r.title}>
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
            {/* Impact label */}
            <div className="ml-14 text-center text-xs text-gray-400 mt-2">← Wpływ →</div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-3 mt-3 flex-wrap">
          {[{s:1,l:'Niskie (1–4)'},{s:5,l:'Średnie (5–9)'},{s:10,l:'Wysokie (10–16)'},{s:17,l:'Krytyczne (17–25)'}].map(({s,l}) => (
            <div key={s} className="flex items-center gap-1.5 text-xs text-gray-600">
              <div className={`w-3 h-3 rounded ${cellColor(s)}`} />
              {l}
            </div>
          ))}
        </div>
      </div>

      {/* Selected cell risks */}
      {selectedCell && cellRisks.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Ryzyka: P={selectedCell.p}, I={selectedCell.i} (Score {selectedCell.p * selectedCell.i})
          </h3>
          <div className="space-y-2">
            {cellRisks.map(r => (
              <button key={r.id} onClick={() => setSelectedRisk(r === selectedRisk ? null : r)}
                className="w-full text-left card p-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${riskScoreColor(r.score)}`}>{r.score}</span>
                  <span className="font-medium text-gray-800 text-sm flex-1">{r.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_STATUS_COLORS[r.status]}`}>{RISK_STATUS_LABELS[r.status]}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Risk list */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Lista ryzyk ({filteredRisks.length})</h3>
        </div>
        {filteredRisks.length === 0 ? (
          <p className="text-center py-6 text-gray-400 text-sm">Brak ryzyk spełniających filtry.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredRisks.sort((a, b) => b.score - a.score).map(r => {
              const isOpen = selectedRisk?.id === r.id
              const linkedTasks = getLinkedTasks(r.id)
              return (
                <div key={r.id}>
                  <button onClick={() => setSelectedRisk(isOpen ? null : r)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${riskScoreColor(r.score)}`}>
                      {r.score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">{r.title}</div>
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
                        <span className="text-xs text-gray-400">P:{r.probability} × I:{r.impact}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
                      {riskScoreLabel(r.score)}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs grid grid-cols-2 gap-2">
                      <div><span className="text-gray-400">Właściciel</span><br /><b>{getOwner(r.owner_id)}</b></div>
                      {r.review_deadline && <div><span className="text-gray-400">Termin przeglądu</span><br /><b>{new Date(r.review_deadline).toLocaleDateString('pl-PL')}</b></div>}
                      {r.description && <div className="col-span-2"><span className="text-gray-400">Opis</span><br /><span className="text-gray-700">{r.description}</span></div>}
                      {r.mitigation_plan && <div className="col-span-2"><span className="text-gray-400">Plan mitygacji</span><br /><span className="text-gray-700">{r.mitigation_plan}</span></div>}
                      {linkedTasks.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-gray-400 flex items-center gap-1 mb-1"><Link2 size={11} /> Powiązane zadania</span>
                          <div className="flex flex-wrap gap-1">
                            {linkedTasks.map(t => t && <span key={t.id} className="bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-700">{t.name}</span>)}
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
