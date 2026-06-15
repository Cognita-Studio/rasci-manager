import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { ProjectFull, IssueCategory } from '../../types'
import { createIssueCategory, updateIssueCategory, deleteIssueCategory } from '../../lib/db'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'
import { useT } from '../../lib/i18n'

const PRESET_COLORS = ['#ef4444','#f97316','#3b82f6','#8b5cf6','#10b981','#f59e0b','#06b6d4','#84cc16','#ec4899','#6b7280']

interface Props { data: ProjectFull; onReload: () => void }

export default function IssueCategoriesTab({ data, onReload }: Props) {
  const { t } = useT()
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; cat?: IssueCategory } | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#ef4444')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openCreate = () => { setName(''); setColor('#ef4444'); setModal({ mode: 'create' }) }
  const openEdit = (c: IssueCategory) => { setName(c.name); setColor(c.color); setModal({ mode: 'edit', cat: c }) }

  const save = async () => {
    if (!name.trim()) return
    setSaving(true); setError(null)
    try {
      if (modal?.mode === 'create') await createIssueCategory(data.project.id, name.trim(), color, data.issueCategories.length)
      else if (modal?.cat) await updateIssueCategory(modal.cat.id, { name: name.trim(), color })
      onReload(); setModal(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setSaving(false) }
  }

  const remove = async (c: IssueCategory) => {
    if (!confirm(t.issueCatDeleteConfirm(c.name))) return
    try { await deleteIssueCategory(c.id); onReload() }
    catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)) }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-body)' }}>{t.issueCategories}</h2>
        <button onClick={openCreate} className="btn-primary"><Plus size={15} /> {t.issueCatAdd}</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {data.issueCategories.length === 0 ? (
        <div className="card p-10 text-center opacity-50" style={{ color: 'var(--color-text-body)' }}>{t.issueCatNone}</div>
      ) : (
        <div className="card divide-y" style={{ borderColor: 'var(--color-border-card)' }}>
          {data.issueCategories.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 group">
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: c.color }} />
              <span className="flex-1 font-medium text-sm" style={{ color: 'var(--color-text-body)' }}>{c.name}</span>
              <span className="text-xs opacity-50" style={{ color: 'var(--color-text-body)' }}>
                {t.issueCatCount(data.issues.filter(i => i.category_id === c.id).length)}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(c)} className="btn-ghost p-1"><Pencil size={13} /></button>
                <button onClick={() => remove(c)} className="btn-ghost p-1 hover:text-red-600"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal.mode === 'create' ? t.issueCatNew : t.issueCatEdit} onClose={() => setModal(null)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-body)' }}>{t.issueCatName}</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus
                onKeyDown={e => e.key === 'Enter' && save()} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-body)' }}>{t.issueCatColor}</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                    style={{ background: c }} />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                <input className="input flex-1" value={color} onChange={e => setColor(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="btn-secondary">{t.cancel}</button>
              <button onClick={save} disabled={!name.trim() || saving} className="btn-primary">
                {saving ? <Spinner size={15} /> : null} {t.save}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
