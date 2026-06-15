import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { ProjectFull, RiskCategory } from '../../types'
import { createRiskCategory, updateRiskCategory, deleteRiskCategory } from '../../lib/db'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'

const PRESET_COLORS = ['#3b82f6','#f59e0b','#8b5cf6','#10b981','#ef4444','#06b6d4','#f97316','#84cc16','#ec4899','#6b7280']

interface Props { data: ProjectFull; onReload: () => void }

export default function RiskCategoriesTab({ data, onReload }: Props) {
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; cat?: RiskCategory } | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [saving, setSaving] = useState(false)

  const openCreate = () => { setName(''); setColor('#3b82f6'); setModal({ mode: 'create' }) }
  const openEdit = (c: RiskCategory) => { setName(c.name); setColor(c.color); setModal({ mode: 'edit', cat: c }) }

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (modal?.mode === 'create') {
        await createRiskCategory(data.project.id, name.trim(), color, data.riskCategories.length)
      } else if (modal?.cat) {
        await updateRiskCategory(modal.cat.id, { name: name.trim(), color })
      }
      onReload(); setModal(null)
    } finally { setSaving(false) }
  }

  const remove = async (c: RiskCategory) => {
    if (!confirm(`Usuń kategorię „${c.name}"? Ryzyka stracą przypisaną kategorię.`)) return
    await deleteRiskCategory(c.id); onReload()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Kategorie ryzyk</h2>
        <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Nowa kategoria</button>
      </div>

      {data.riskCategories.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">Brak kategorii. Dodaj pierwszą.</div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {data.riskCategories.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group">
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: c.color }} />
              <span className="flex-1 font-medium text-gray-800 text-sm">{c.name}</span>
              <span className="text-xs text-gray-400">
                {data.risks.filter(r => r.category_id === c.id).length} ryzyk
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
        <Modal title={modal.mode === 'create' ? 'Nowa kategoria' : 'Edytuj kategorię'} onClose={() => setModal(null)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa *</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus
                onKeyDown={e => e.key === 'Enter' && save()} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kolor</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                    style={{ background: c }} />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                <input className="input flex-1" value={color} onChange={e => setColor(e.target.value)} placeholder="#000000" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="btn-secondary">Anuluj</button>
              <button onClick={save} disabled={!name.trim() || saving} className="btn-primary">
                {saving ? <Spinner size={15} /> : null} Zapisz
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
