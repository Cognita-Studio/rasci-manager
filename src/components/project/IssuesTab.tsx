import { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, History, Link2, ShieldAlert } from 'lucide-react'
import type { ProjectFull, Issue, IssueStatus, IssueHistory } from '../../types'
import { ISSUE_STATUS_LABELS, ISSUE_STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '../../types'
import { createIssue, updateIssue, deleteIssue, setIssueTaskLinks, setIssueRiskLinks, loadIssueHistory, createDefaultIssueCategories } from '../../lib/db'
import { riskScoreColor } from '../../types'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'
import { useT } from '../../lib/i18n'
import type { Priority } from '../../types'

interface Props { data: ProjectFull; onReload: () => void }

const EMPTY = {
  title: '', description: '', category_id: '', status: 'open' as IssueStatus,
  priority: '' as Priority | '', owner_id: '', deadline: '',
}

export default function IssuesTab({ data, onReload }: Props) {
  const { t } = useT()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; issue?: Issue } | null>(null)
  const [fields, setFields] = useState(EMPTY)
  const [linkedTaskIds, setLinkedTaskIds] = useState<Set<string>>(new Set())
  const [linkedRiskIds, setLinkedRiskIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [historyIssue, setHistoryIssue] = useState<Issue | null>(null)
  const [history, setHistory] = useState<IssueHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [initializingCats, setInitializingCats] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allTasks = data.taskGroups.flatMap(g => g.tasks)

  const openCreate = () => {
    setFields(EMPTY); setLinkedTaskIds(new Set()); setLinkedRiskIds(new Set())
    setModal({ mode: 'create' })
  }

  const openEdit = (issue: Issue) => {
    setFields({
      title: issue.title, description: issue.description ?? '',
      category_id: issue.category_id ?? '', status: issue.status,
      priority: issue.priority ?? '', owner_id: issue.owner_id ?? '', deadline: issue.deadline ?? '',
    })
    setLinkedTaskIds(new Set(data.issueTaskLinks.filter(l => l.issue_id === issue.id).map(l => l.task_id)))
    setLinkedRiskIds(new Set(data.issueRiskLinks.filter(l => l.issue_id === issue.id).map(l => l.risk_id)))
    setModal({ mode: 'edit', issue })
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFields(f => ({ ...f, [k]: e.target.value }))

  const buildHistory = (issue: Issue) => {
    const changes: { field: string; old_value: string | null; new_value: string | null }[] = []
    for (const f of ['status', 'priority', 'category_id', 'owner_id'] as (keyof Issue)[]) {
      const oldVal = String(issue[f] ?? '')
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
        status: fields.status,
        priority: (fields.priority || null) as Priority | null,
        owner_id: fields.owner_id || null,
        deadline: fields.deadline || null,
      }
      if (modal?.mode === 'create') {
        const issue = await createIssue(data.project.id, payload)
        await setIssueTaskLinks(issue.id, [...linkedTaskIds])
        await setIssueRiskLinks(issue.id, [...linkedRiskIds])
      } else if (modal?.issue) {
        await updateIssue(modal.issue.id, payload, buildHistory(modal.issue))
        await setIssueTaskLinks(modal.issue.id, [...linkedTaskIds])
        await setIssueRiskLinks(modal.issue.id, [...linkedRiskIds])
      }
      onReload(); setModal(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setSaving(false) }
  }

  const remove = async (issue: Issue) => {
    if (!confirm(t.issueDeleteConfirm(issue.title))) return
    try { await deleteIssue(issue.id); onReload() }
    catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)) }
  }

  const showHistory = async (issue: Issue) => {
    setHistoryIssue(issue); setHistoryLoading(true)
    setHistory(await loadIssueHistory(issue.id))
    setHistoryLoading(false)
  }

  const toggleTask = (id: string) => setLinkedTaskIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleRisk = (id: string) => setLinkedRiskIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const initCategories = async () => {
    setInitializingCats(true); setError(null)
    try {
      await createDefaultIssueCategories(data.project.id)
      onReload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setInitializingCats(false) }
  }

  const getLinkedTasks = (issueId: string) =>
    data.issueTaskLinks.filter(l => l.issue_id === issueId).map(l => allTasks.find(t => t.id === l.task_id)).filter(Boolean)
  const getLinkedRisks = (issueId: string) =>
    data.issueRiskLinks.filter(l => l.issue_id === issueId).map(l => data.risks.find(r => r.id === l.risk_id)).filter(Boolean)
  const getOwnerName = (id: string | null) =>
    id ? (data.projectStakeholders.find(s => s.stakeholderId === id)?.name ?? '—') : '—'
  const getCatName = (id: string | null) =>
    id ? (data.issueCategories.find(c => c.id === id)?.name ?? '') : ''
  const getCatColor = (id: string | null) =>
    id ? (data.issueCategories.find(c => c.id === id)?.color ?? '#6b7280') : '#6b7280'

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-body)' }}>{t.issues}</h2>
        <div className="flex gap-2">
          {data.issueCategories.length === 0 && (
            <button onClick={initCategories} disabled={initializingCats} className="btn-secondary text-sm">
              {initializingCats ? <Spinner size={14} /> : null} {t.issueDefaultCategoriesBtn}
            </button>
          )}
          <button onClick={openCreate} className="btn-primary"><Plus size={15} /> {t.issueAdd}</button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {data.issues.length === 0 ? (
        <div className="card p-10 text-center opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.issueNone}</div>
      ) : (
        <div className="space-y-2">
          {data.issues.map(issue => {
            const isExpanded = expanded.has(issue.id)
            const linkedTasks = getLinkedTasks(issue.id)
            const linkedRisks = getLinkedRisks(issue.id)
            return (
              <div key={issue.id} className="card overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-black/5"
                  onClick={() => setExpanded(prev => { const n = new Set(prev); n.has(issue.id) ? n.delete(issue.id) : n.add(issue.id); return n })}>
                  {isExpanded ? <ChevronDown size={15} className="flex-shrink-0 opacity-40" /> : <ChevronRight size={15} className="flex-shrink-0 opacity-40" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm" style={{ color: 'var(--color-text-body)' }}>{issue.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ISSUE_STATUS_COLORS[issue.status]}`}>
                        {ISSUE_STATUS_LABELS[issue.status]}
                      </span>
                      {issue.priority && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[issue.priority]}`}>
                          {PRIORITY_LABELS[issue.priority]}
                        </span>
                      )}
                      {issue.category_id && (
                        <span className="text-xs px-2 py-0.5 rounded-full text-white"
                          style={{ background: getCatColor(issue.category_id) }}>
                          {getCatName(issue.category_id)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); showHistory(issue) }} className="btn-ghost p-1 opacity-50"><History size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); openEdit(issue) }} className="btn-ghost p-1 opacity-50"><Pencil size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); remove(issue) }} className="btn-ghost p-1 opacity-50 hover:text-red-600 hover:opacity-100"><Trash2 size={14} /></button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs"
                    style={{ borderColor: 'var(--color-border-card)', backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 85%, var(--color-bg-page))' }}>
                    <div>
                      <span className="opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.issueOwner}</span><br />
                      <b style={{ color: 'var(--color-text-body)' }}>{getOwnerName(issue.owner_id)}</b>
                    </div>
                    {issue.deadline && (
                      <div>
                        <span className="opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.issueDeadline}</span><br />
                        <b style={{ color: 'var(--color-text-body)' }}>{new Date(issue.deadline).toLocaleDateString()}</b>
                      </div>
                    )}
                    {issue.description && (
                      <div className="col-span-2 sm:col-span-3">
                        <span className="opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.issueDescription}</span><br />
                        <span style={{ color: 'var(--color-text-body)' }}>{issue.description}</span>
                      </div>
                    )}
                    {linkedTasks.length > 0 && (
                      <div className="col-span-2 sm:col-span-3">
                        <span className="opacity-50 flex items-center gap-1 mb-1" style={{ color: 'var(--color-text-body)' }}>
                          <Link2 size={11} /> {t.issueLinkedTasks}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {linkedTasks.map(task => task && (
                            <span key={task.id} className="border rounded px-2 py-0.5"
                              style={{ borderColor: 'var(--color-border-card)', color: 'var(--color-text-body)' }}>{task.name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {linkedRisks.length > 0 && (
                      <div className="col-span-2 sm:col-span-3">
                        <span className="opacity-50 flex items-center gap-1 mb-1" style={{ color: 'var(--color-text-body)' }}>
                          <ShieldAlert size={11} /> {t.issueLinkedRisks}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {linkedRisks.map(risk => risk && (
                            <span key={risk.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${riskScoreColor(risk.score)}`}>
                              <b>{risk.score}</b> {risk.title}
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

      {/* Create/Edit Modal */}
      {modal && (
        <Modal title={modal.mode === 'create' ? t.issueAdd : t.issueEdit} onClose={() => setModal(null)} size="lg">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-body)' }}>{t.issueTitle}</label>
              <input className="input" value={fields.title} onChange={set('title')} autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-body)' }}>{t.issueDescription}</label>
              <textarea className="input resize-none" rows={2} value={fields.description} onChange={set('description')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-body)' }}>{t.issueCategory}</label>
                <select className="input" value={fields.category_id} onChange={set('category_id')}>
                  <option value="">— —</option>
                  {data.issueCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-body)' }}>{t.issueStatus}</label>
                <select className="input" value={fields.status} onChange={set('status')}>
                  {Object.entries(ISSUE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-body)' }}>{t.issuePriority}</label>
                <select className="input" value={fields.priority} onChange={set('priority')}>
                  <option value="">— —</option>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-body)' }}>{t.issueOwner}</label>
                <select className="input" value={fields.owner_id} onChange={set('owner_id')}>
                  <option value="">— —</option>
                  {data.projectStakeholders.map(s => <option key={s.stakeholderId} value={s.stakeholderId}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-body)' }}>{t.issueDeadline}</label>
              <input type="date" className="input" value={fields.deadline} onChange={set('deadline')} />
            </div>

            {/* Linked tasks */}
            {allTasks.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-body)' }}>
                  {t.issueLinkedTasksEdit} ({linkedTaskIds.size})
                </label>
                <div className="max-h-32 overflow-y-auto border rounded-lg divide-y"
                  style={{ borderColor: 'var(--color-border-card)' }}>
                  {data.taskGroups.map(g => (
                    <div key={g.id}>
                      <div className="px-3 py-1 text-xs font-semibold opacity-50 theme-group-bg theme-group-text">{g.name}</div>
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

            {/* Linked risks */}
            {data.risks.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-body)' }}>
                  {t.issueLinkedRisksEdit} ({linkedRiskIds.size})
                </label>
                <div className="max-h-32 overflow-y-auto border rounded-lg divide-y"
                  style={{ borderColor: 'var(--color-border-card)' }}>
                  {data.risks.map(risk => (
                    <label key={risk.id} className="flex items-center gap-2 px-3 py-2 hover:bg-black/5 cursor-pointer">
                      <input type="checkbox" checked={linkedRiskIds.has(risk.id)} onChange={() => toggleRisk(risk.id)}
                        style={{ accentColor: 'var(--color-primary)' }} />
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${riskScoreColor(risk.score)}`}>
                        {risk.score}
                      </span>
                      <span className="text-sm flex-1" style={{ color: 'var(--color-text-body)' }}>{risk.title}</span>
                    </label>
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
      {historyIssue && (
        <Modal title={`${t.issueHistoryTitle}: ${historyIssue.title}`} onClose={() => setHistoryIssue(null)} size="md">
          {historyLoading ? <div className="flex justify-center py-6"><Spinner /></div>
            : history.length === 0 ? (
              <p className="text-center py-6 opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.issueHistoryEmpty}</p>
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
