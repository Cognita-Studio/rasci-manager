import { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, User, Mail, Phone } from 'lucide-react'
import type { ProjectFull, Stakeholder, StakeholderGroup } from '../../types'
import {
  createStakeholderGroup, updateStakeholderGroup, deleteStakeholderGroup,
  createStakeholder, updateStakeholder, deleteStakeholder,
} from '../../lib/db'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'
import { useT } from '../../lib/i18n'

interface Props { data: ProjectFull; onReload: () => void }
const EMPTY = { name: '', email: '', phone: '', position: '', project_role: '' }

export default function StakeholdersTab({ data, onReload }: Props) {
  const { t } = useT()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [groupModal, setGroupModal] = useState<{ mode: 'create' | 'edit'; group?: StakeholderGroup } | null>(null)
  const [stModal, setStModal] = useState<{ mode: 'create' | 'edit'; groupId: string; stakeholder?: Stakeholder } | null>(null)
  const [saving, setSaving] = useState(false)
  const [gName, setGName] = useState('')
  const [fields, setFields] = useState(EMPTY)

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields(prev => ({ ...prev, [k]: e.target.value }))

  const openGroupCreate = () => { setGName(''); setGroupModal({ mode: 'create' }) }
  const openGroupEdit = (g: StakeholderGroup) => { setGName(g.name); setGroupModal({ mode: 'edit', group: g }) }
  const openStCreate = (groupId: string) => { setFields(EMPTY); setStModal({ mode: 'create', groupId }) }
  const openStEdit = (groupId: string, s: Stakeholder) => {
    setFields({ name: s.name, email: s.email ?? '', phone: s.phone ?? '', position: s.position ?? '', project_role: s.project_role ?? '' })
    setStModal({ mode: 'edit', groupId, stakeholder: s })
  }

  const saveGroup = async () => {
    if (!gName.trim()) return
    setSaving(true)
    try {
      if (groupModal?.mode === 'create') await createStakeholderGroup(data.project.id, gName.trim(), data.stakeholderGroups.length)
      else if (groupModal?.group) await updateStakeholderGroup(groupModal.group.id, gName.trim())
      onReload(); setGroupModal(null)
    } finally { setSaving(false) }
  }

  const removeGroup = async (g: StakeholderGroup) => {
    if (!confirm(t.deleteStakeholderGroupConfirm(g.name))) return
    await deleteStakeholderGroup(g.id); onReload()
  }

  const saveSt = async () => {
    if (!fields.name.trim() || !stModal) return
    setSaving(true)
    try {
      const payload = {
        name: fields.name.trim(),
        email: fields.email || null,
        phone: fields.phone || null,
        position: fields.position || null,
        project_role: fields.project_role || null,
      }
      if (stModal.mode === 'create') {
        const group = data.stakeholderGroups.find(g => g.id === stModal.groupId)
        await createStakeholder(stModal.groupId, payload, group?.stakeholders.length ?? 0)
      } else if (stModal.stakeholder) {
        await updateStakeholder(stModal.stakeholder.id, payload)
      }
      onReload(); setStModal(null)
    } finally { setSaving(false) }
  }

  const removeSt = async (s: Stakeholder) => {
    if (!confirm(t.deleteStakeholderConfirm(s.name))) return
    await deleteStakeholder(s.id); onReload()
  }

  const toggleGroup = (id: string) => {
    setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">{t.stakeholderGroups}</h2>
        <button onClick={openGroupCreate} className="btn-primary"><Plus size={15} /> {t.newGroup}</button>
      </div>

      {data.stakeholderGroups.length === 0 && (
        <div className="card p-10 text-center text-gray-400">{t.noStakeholderGroups}</div>
      )}

      {data.stakeholderGroups.map(group => (
        <div key={group.id} className="card overflow-hidden">
          <div
            className="flex items-center gap-2 px-4 py-3 border-b cursor-pointer bg-purple-50 border-purple-100"
            onClick={() => toggleGroup(group.id)}
          >
            {collapsed.has(group.id)
              ? <ChevronRight size={16} className="text-purple-500" />
              : <ChevronDown size={16} className="text-purple-500" />
            }
            <span className="font-semibold text-purple-800 flex-1">{group.name}</span>
            <span className="text-xs text-purple-400">{t.people_count(group.stakeholders.length)}</span>
            <button onClick={e => { e.stopPropagation(); openGroupEdit(group) }} className="btn-ghost p-1 text-gray-500">
              <Pencil size={14} />
            </button>
            <button onClick={e => { e.stopPropagation(); removeGroup(group) }} className="btn-ghost p-1 text-gray-500 hover:text-red-600">
              <Trash2 size={14} />
            </button>
          </div>

          {!collapsed.has(group.id) && (
            <div>
              {group.stakeholders.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 group">
                  <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {s.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm">{s.name}</div>
                    <div className="flex gap-3 mt-0.5 flex-wrap">
                      {s.position && <span className="text-xs text-gray-500">{s.position}</span>}
                      {s.project_role && <span className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>{s.project_role}</span>}
                    </div>
                    <div className="flex gap-3 mt-0.5 flex-wrap">
                      {s.email && <span className="text-xs text-gray-400 flex items-center gap-1"><Mail size={11} />{s.email}</span>}
                      {s.phone && <span className="text-xs text-gray-400 flex items-center gap-1"><Phone size={11} />{s.phone}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openStEdit(group.id, s)} className="btn-ghost p-1 text-gray-500"><Pencil size={14} /></button>
                    <button onClick={() => removeSt(s)} className="btn-ghost p-1 text-gray-500 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              <div className="px-4 py-2.5">
                <button onClick={() => openStCreate(group.id)} className="btn-ghost text-xs text-purple-600">
                  <Plus size={13} /> {t.addStakeholder}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {groupModal && (
        <Modal title={groupModal.mode === 'create' ? t.newStakeholderGroup : t.editStakeholderGroup} onClose={() => setGroupModal(null)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.groupName} *</label>
              <input className="input" value={gName} onChange={e => setGName(e.target.value)} autoFocus
                onKeyDown={e => e.key === 'Enter' && saveGroup()} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setGroupModal(null)} className="btn-secondary">{t.cancel}</button>
              <button onClick={saveGroup} disabled={!gName.trim() || saving} className="btn-primary">
                {saving ? <Spinner size={15} /> : null} {t.save}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {stModal && (
        <Modal title={stModal.mode === 'create' ? t.newStakeholder : t.editStakeholder} onClose={() => setStModal(null)} size="md">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.fullName} *</label>
              <input className="input" value={fields.name} onChange={set('name')} autoFocus placeholder={t.fullNamePlaceholder} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.position}</label>
                <input className="input" value={fields.position} onChange={set('position')} placeholder={t.positionPlaceholder} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.projectRole}</label>
                <input className="input" value={fields.project_role} onChange={set('project_role')} placeholder={t.projectRolePlaceholder} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
                <input className="input" type="email" value={fields.email} onChange={set('email')} placeholder="jan@firma.pl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.phone}</label>
                <input className="input" type="tel" value={fields.phone} onChange={set('phone')} placeholder="+48 600 000 000" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setStModal(null)} className="btn-secondary">{t.cancel}</button>
              <button onClick={saveSt} disabled={!fields.name.trim() || saving} className="btn-primary">
                {saving ? <Spinner size={15} /> : <User size={15} />} {t.save}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
