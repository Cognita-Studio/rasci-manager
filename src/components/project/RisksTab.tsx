import { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, History, Link2 } from 'lucide-react'
import type { ProjectFull, Risk, RiskStatus } from '../../types'
import { RISK_STATUS_LABELS, RISK_STATUS_COLORS, riskScoreColor, riskScoreLabel } from '../../types'
import { createRisk, updateRisk, deleteRisk, setRiskTaskLinks, loadRiskHistory, createDefaultRiskCategories } from '../../lib/db'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'
import type { RiskHistory } from '../../types'
import { useT } from '../../lib/i18n'

interface Props { data: ProjectFull; onReload: () => void }

const EMPTY_RISK = {
  title: '', description: '', category_id: '', probability: 3, impact: 3,
  status: 'open' as RiskStatus, owner_id: '', mitigation_plan: '', review_deadline: '',
}

export default function RisksTab({ data, onReload }: Props) {
  const { t } = useT()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; risk?: Risk } | null>(null)
  const [fields, setFields] = useState(EMPTY_RISK)
  const [linkedTaskIds, setLinkedTaskIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [historyRisk, setHistoryRisk] = useState<Risk | null>(null)
  const [history, setHistory] = useState<RiskHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [initializingCats, setInitializingCats] = useState(false)

  const allTasks = data.taskGroups.flatMap(g => g.tasks)

  const P_LABELS = ['', t.riskProbVeryLow.replace('\n', ' '), t.riskProbLow, t.riskProbMedium, t.riskProbHigh, t.riskProbVeryHigh.replace('\n', ' ')]
  const I_LABELS = ['', t.riskImpactNegligible, t.riskImpactMinor, t.riskImpactModerate, t.riskImpactMajor, t.riskImpactCritical]

  const openCreate = () => { setFields(EMPTY_RISK); setLinkedTaskIds(new Set()); setModal({ mode: 'create' }) }

  const openEdit = (r: Risk) => {
    setFields({
      title: r.title, description: r.description ?? '', category_id: r.category_id ?? '',
      probability: r.probability, impact: r.impact, status: r.status,
      owner_id: r.owner_id ?? '', mitigation_plan: r.mitigation_plan ?? '',
      review_deadline: r.review_deadline ?? '',
    })
    setLinkedTaskIds(new Set(data.riskTaskLinks.filter(l => l.risk_id === r.id).map(l => l.task_id)))
    setModal({ mode: 'edit', risk: r })
  }

  const set = (k: keyof typeof EMPTY_RISK) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFields(f => ({ ...f, [k]: e.target.value }))

  const buildHistory = (r: Risk) => {
    const changes: { field: string; old_value: string | null; new_value: string | null }[] = []
    for (const f of ['status', 'probability', 'impact', 'category_id', 'owner_id'] as (keyof Risk)[]) {
      const oldVal = String(r[f] ?? '')
      const newVal = String((fields as Record<string, unknown>)[f as string] ?? '')
      if (oldVal !== newVal) changes.push({ field: f, old_value: oldVal || null, new_value: newVal || null })
    }
    return changes
  }

  const save = async () => {
    if (!fields.title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: fields.title.trim(),
        description: fields.description || null,
        category_id: fields.category_id || null,
        probability: Number(fields.probability),
        impact: Number(fields.impact),
        status: fields.status,
        owner_id: fields.owner_id || null,
        mitigation_plan: fields.mitigation_plan || null,
        review_deadline: fields.review_deadline || null,
      }
      if (modal?.mode === 'create') {
        const risk = await createRisk(data.project.id, payload)
        await setRiskTaskLinks(risk.id, [...linkedTaskIds])
      } else if (modal?.risk) {
        await updateRisk(modal.risk.id, payload, buildHistory(modal.risk))
        await setRiskTaskLinks(modal.risk.id, [...linkedTaskIds])
      }
      onReload(); setModal(null)
    } finally { setSaving(false) }
  }

  const remove = async (r: Risk) => {
    if (!confirm(t.riskDeleteConfirm(r.title))) return
    await deleteRisk(r.id); onReload()
  }

  const showHistory = async (r: Risk) => {
    setHistoryRisk(r); setHistoryLoading(true)
    setHistory(await loadRiskHistory(r.id))
    setHistoryLoading(false)
  }

  const toggleTask = (taskId: string) => setLinkedTaskIds(prev => {
    const n = new Set(prev); n.has(taskId) ? n.delete(taskId) : n.add(taskId); return n
  })

  const initCategories = async () => {
    setInitializingCats(true)
    await createDefaultRiskCategories(data.project.id)
    onReload(); setInitializingCats(false)
  }

  const score = Number(fields.probability) * Number(fields.impact)

  const getRiskLinkedTasks = (riskId: string) =>
    data.riskTaskLinks.filter(l => l.risk_id === riskId).map(l => allTasks.find(tk => tk.id === l.task_id)).filter(Boolean)
  const getOwnerName = (ownerId: string | null) =>
    ownerId ? (data.projectStakeholders.find(s => s.stakeholderId === ownerId)?.name ?? '—') : '—'
  const getCategoryName = (catId: string | null) =>
    catId ? (data.riskCategories.find(c => c.id === catId)?.name ?? '—') : '—'
  const getCategoryColor = (catId: string | null) =>
    catId ? (data.riskCategories.find(c => c.id === catId)?.color ?? '#6b7280') : '#6b7280'

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-body)' }}>{t.risks}</h2>
        <div className="flex gap-2">
          {data.riskCategories.length === 0 && (
            <button onClick={initCategories} disabled={initializingCats} className="btn-secondary text-sm">
              {initializingCats ? <Spinner size={14} /> : null} {t.riskDefaultCategoriesBtn}
            </button>
          )}
          <button onClick={openCreate} className="btn-primary"><Plus size={15} /> {t.riskAdd}</button>
        </div>
      </div>

      {data.risks.length === 0 ? (
        <div className="card p-10 text-center" style={{ color: 'var(--color-text-body)', opacity: 0.5 }}>{t.riskNone}</div>
      ) : (
        <div className="space-y-2">
          {data.risks.map(r => {
            const isExpanded = expanded.has(r.id)
            const linkedTasks = getRiskLinkedTasks(r.id)
            return (
              <div key={r.id} className="card overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-black/5"
                  onClick={() => setExpanded(prev => { const n = new Set(prev); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n })}>
                  {isExpanded ? <ChevronDown size={15} className="flex-shrink-0 opacity-40" /> : <ChevronRight size={15} className="flex-shrink-0 opacity-40" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm" style={{ color: 'var(--color-text-body)' }}>{r.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_STATUS_COLORS[r.status]}`}>{RISK_STATUS_LABELS[r.status]}</span>
                      {r.category_id && (
                        <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: getCategoryColor(r.category_id) }}>
                          {getCategoryName(r.category_id)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold ${riskScoreColor(r.score)}`}>
                    {r.score}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); showHistory(r) }} className="btn-ghost p-1 opacity-50"><History size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); openEdit(r) }} className="btn-ghost p-1 opacity-50"><Pencil size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); remove(r) }} className="btn-ghost p-1 opacity-50 hover:text-red-600 hover:opacity-100"><Trash2 size={14} /></button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs"
                    style={{ borderColor: 'var(--color-border-card)', backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 85%, var(--color-bg-page))' }}>
                    <div>
                      <span className="opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.riskProbability}</span><br />
                      <b style={{ color: 'var(--color-text-body)' }}>{P_LABELS[r.probability]} ({r.probability})</b>
                    </div>
                    <div>
                      <span className="opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.riskImpact}</span><br />
                      <b style={{ color: 'var(--color-text-body)' }}>{I_LABELS[r.impact]} ({r.impact})</b>
                    </div>
                    <div>
                      <span className="opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.riskScore}</span><br />
                      <b className={`px-2 py-0.5 rounded ${riskScoreColor(r.score)}`}>{r.score} — {riskScoreLabel(r.score)}</b>
                    </div>
                    <div>
                      <span className="opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.riskOwner}</span><br />
                      <b style={{ color: 'var(--color-text-body)' }}>{getOwnerName(r.owner_id)}</b>
                    </div>
                    {r.review_deadline && (
                      <div>
                        <span className="opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.riskReviewDate}</span><br />
                        <b style={{ color: 'var(--color-text-body)' }}>{new Date(r.review_deadline).toLocaleDateString()}</b>
                      </div>
                    )}
                    {r.description && (
                      <div className="col-span-2 sm:col-span-4">
                        <span className="opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.riskDescription}</span><br />
                        <span style={{ color: 'var(--color-text-body)' }}>{r.description}</span>
                      </div>
                    )}
                    {r.mitigation_plan && (
                      <div className="col-span-2 sm:col-span-4">
                        <span className="opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.riskMitigationPlan}</span><br />
                        <span style={{ color: 'var(--color-text-body)' }}>{r.mitigation_plan}</span>
                      </div>
                    )}
                    {linkedTasks.length > 0 && (
                      <div className="col-span-2 sm:col-span-4">
                        <span className="opacity-50 flex items-center gap-1 mb-1" style={{ color: 'var(--color-text-body)' }}>
                          <Link2 size={11} /> {t.riskLinkedTasks}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {linkedTasks.map(tk => tk && (
                            <span key={tk.id} className="border rounded px-2 py-0.5"
                              style={{ borderColor: 'var(--color-border-card)', color: 'var(--color-text-body)' }}>{tk.name}</span>
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

      {/* Risk modal */}
      {modal && (
        <Modal title={modal.mode === 'create' ? t.riskAdd : t.riskEdit} onClose={() => setModal(null)} size="lg">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-body)' }}>{t.riskTitle}</label>
              <input className="input" value={fields.title} onChange={set('title')} autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-body)' }}>{t.riskDescription}</label>
              <textarea className="input resize-none" rows={2} value={fields.description} onChange={set('description')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-body)' }}>{t.riskCategory}</label>
                <select className="input" value={fields.category_id} onChange={set('category_id')}>
                  <option value="">— —</option>
                  {data.riskCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-body)' }}>{t.riskStatus}</label>
                <select className="input" value={fields.status} onChange={set('status')}>
                  {Object.entries(RISK_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-body)' }}>
                  {t.riskProbability}: <b>{P_LABELS[Number(fields.probability)]} ({fields.probability})</b>
                </label>
                <input type="range" min={1} max={5} value={fields.probability} onChange={set('probability')}
                  className="w-full" style={{ accentColor: 'var(--color-primary)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-body)' }}>
                  {t.riskImpact}: <b>{I_LABELS[Number(fields.impact)]} ({fields.impact})</b>
                </label>
                <input type="range" min={1} max={5} value={fields.impact} onChange={set('impact')}
                  className="w-full" style={{ accentColor: 'var(--color-primary)' }} />
              </div>
            </div>
            <div className={`text-center py-2 rounded-lg font-semibold ${riskScoreColor(score)}`}>
              {t.riskScore}: {score} — {riskScoreLabel(score)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-body)' }}>{t.riskOwnerField}</label>
                <select className="input" value={fields.owner_id} onChange={set('owner_id')}>
                  <option value="">— —</option>
                  {data.projectStakeholders.map(s => <option key={s.stakeholderId} value={s.stakeholderId}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-body)' }}>{t.riskReviewDate}</label>
                <input type="date" className="input" value={fields.review_deadline} onChange={set('review_deadline')} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-body)' }}>{t.riskMitigation}</label>
              <textarea className="input resize-none" rows={2} value={fields.mitigation_plan} onChange={set('mitigation_plan')} />
            </div>
            {allTasks.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-body)' }}>
                  {t.riskLinkedTasksEdit} ({linkedTaskIds.size})
                </label>
                <div className="max-h-36 overflow-y-auto border rounded-lg divide-y"
                  style={{ borderColor: 'var(--color-border-card)' }}>
                  {data.taskGroups.map(g => (
                    <div key={g.id}>
                      <div className="px-3 py-1.5 text-xs font-semibold opacity-50 theme-group-bg theme-group-text">{g.name}</div>
                      {g.tasks.map(tk => (
                        <label key={tk.id} className="flex items-center gap-2 px-3 py-2 hover:bg-black/5 cursor-pointer">
                          <input type="checkbox" checked={linkedTaskIds.has(tk.id)} onChange={() => toggleTask(tk.id)}
                            style={{ accentColor: 'var(--color-primary)' }} />
                          <span className="text-sm" style={{ color: 'var(--color-text-body)' }}>{tk.name}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="btn-secondary">{t.cancel}</button>
              <button onClick={save} disabled={!fields.title.trim() || saving} className="btn-primary">
                {saving ? <Spinner size={15} /> : null} {t.save}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* History modal */}
      {historyRisk && (
        <Modal title={`${t.riskHistoryTitle}: ${historyRisk.title}`} onClose={() => setHistoryRisk(null)} size="md">
          {historyLoading ? <div className="flex justify-center py-6"><Spinner /></div>
            : history.length === 0 ? (
              <p className="text-center py-6 opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.riskHistoryEmpty}</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {history.map(h => (
                  <div key={h.id} className="text-sm border rounded-lg p-3" style={{ borderColor: 'var(--color-border-card)' }}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium capitalize" style={{ color: 'var(--color-text-body)' }}>{h.field}</span>
                      <span className="text-xs opacity-50" style={{ color: 'var(--color-text-body)' }}>
                        {new Date(h.changed_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded">{h.old_value ?? '—'}</span>
                      <span className="opacity-40" style={{ color: 'var(--color-text-body)' }}>→</span>
                      <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded">{h.new_value ?? '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </Modal>
      )}
    </div>
  )
}
