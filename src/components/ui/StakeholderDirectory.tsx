import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Users } from 'lucide-react'
import Modal from './Modal'
import Spinner from './Spinner'
import { listStakeholders, createStakeholder, updateStakeholder, deleteStakeholder } from '../../lib/db'
import type { Stakeholder } from '../../types'

interface Props { workspaceId: string; onClose: () => void }

const EMPTY = { name: '', email: '', phone: '', position: '' }

export default function StakeholderDirectory({ workspaceId, onClose }: Props) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Stakeholder | null>(null)
  const [creating, setCreating] = useState(false)
  const [fields, setFields] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = () => {
    listStakeholders(workspaceId).then(setStakeholders).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [workspaceId])

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields(f => ({ ...f, [k]: e.target.value }))

  const openCreate = () => { setFields(EMPTY); setCreating(true); setEditing(null) }
  const openEdit = (s: Stakeholder) => {
    setFields({ name: s.name, email: s.email ?? '', phone: s.phone ?? '', position: s.position ?? '' })
    setEditing(s); setCreating(false)
  }

  const save = async () => {
    if (!fields.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: fields.name.trim(),
        email: fields.email || null,
        phone: fields.phone || null,
        position: fields.position || null,
      }
      if (creating) {
        await createStakeholder(workspaceId, payload)
      } else if (editing) {
        await updateStakeholder(editing.id, payload)
      }
      load(); setCreating(false); setEditing(null)
    } finally { setSaving(false) }
  }

  const remove = async (s: Stakeholder) => {
    if (!confirm(`Usuń „${s.name}" z bazy? Zostanie usunięty ze wszystkich projektów.`)) return
    await deleteStakeholder(s.id)
    setStakeholders(prev => prev.filter(x => x.id !== s.id))
  }

  const filtered = stakeholders.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.position ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Modal title="Baza stakeholderów" onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-8"
              placeholder="Szukaj po nazwie lub stanowisku…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button onClick={openCreate} className="btn-primary flex-shrink-0">
            <Plus size={15} /> Dodaj
          </button>
        </div>

        {(creating || editing) && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">
              {creating ? 'Nowy stakeholder' : `Edycja: ${editing?.name}`}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Imię i nazwisko *</label>
                <input className="input" value={fields.name} onChange={set('name')} autoFocus placeholder="Jan Kowalski" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Stanowisko</label>
                <input className="input" value={fields.position} onChange={set('position')} placeholder="np. Kierownik działu" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                <input className="input" type="email" value={fields.email} onChange={set('email')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                <input className="input" type="tel" value={fields.phone} onChange={set('phone')} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setCreating(false); setEditing(null) }} className="btn-secondary text-xs">Anuluj</button>
              <button onClick={save} disabled={!fields.name.trim() || saving} className="btn-primary text-xs">
                {saving ? <Spinner size={13} /> : null} Zapisz
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Users size={32} className="mx-auto mb-2 opacity-30" />
            {search ? 'Brak wyników' : 'Baza jest pusta. Dodaj pierwszego stakeholdera.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-[50vh] overflow-y-auto">
            {filtered.map(s => (
              <div key={s.id} className="flex items-center gap-3 py-3 group">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {s.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{s.name}</div>
                  <div className="text-xs text-gray-400">{[s.position, s.email].filter(Boolean).join(' · ')}</div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(s)} className="btn-ghost p-1"><Pencil size={13} /></button>
                  <button onClick={() => remove(s)} className="btn-ghost p-1 hover:text-red-600"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 text-center">
          {stakeholders.length} {stakeholders.length === 1 ? 'osoba' : 'osób'} w bazie
        </p>
      </div>
    </Modal>
  )
}
