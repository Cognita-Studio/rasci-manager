import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, UserPlus, Mail, Phone, Search } from 'lucide-react'
import type { ProjectFull, Stakeholder, StakeholderGroup } from '../../types'
import {
  createStakeholderGroup, updateStakeholderGroup, deleteStakeholderGroup,
  addStakeholderToProject, updateMembership, removeMembership,
  listStakeholders, createStakeholder,
} from '../../lib/db'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'
import { useT } from '../../lib/i18n'

interface Props { data: ProjectFull; onReload: () => void }

export default function StakeholdersTab({ data, onReload }: Props) {
  const { t } = useT()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [groupModal, setGroupModal] = useState<{ mode: 'create' | 'edit'; group?: StakeholderGroup } | null>(null)
  const [memberModal, setMemberModal] = useState<{
    mode: 'add' | 'edit'; membershipId?: string; defaultGroupId?: string
  } | null>(null)
  const [gName, setGName] = useState('')
  const [saving, setSaving] = useState(false)
  const [allStakeholders, setAllStakeholders] = useState<Stakeholder[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [memberGroupId, setMemberGroupId] = useState('')
  const [memberRole, setMemberRole] = useState('')
  // New stakeholder creation inside modal
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPos, setNewPos] = useState('')
  const [newEmail, setNewEmail] = useState('')

  const projectStakeholderIds = new Set(data.projectStakeholders.map(s => s.stakeholderId))

  const loadDirectory = () => {
    if (!data.project.workspace_id) return
    listStakeholders(data.project.workspace_id).then(setAllStakeholders)
  }

  useEffect(() => { if (memberModal?.mode === 'add') loadDirectory() }, [memberModal])

  const toggleGroup = (id: string) => setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

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
    if (!confirm(`Usuń grupę „${g.name}" i wszystkich jej członków z projektu?`)) return
    await deleteStakeholderGroup(g.id); onReload()
  }

  const openAddModal = (defaultGroupId = '') => {
    setSearch(''); setSelectedId(''); setMemberGroupId(defaultGroupId); setMemberRole('')
    setCreating(false); setNewName(''); setNewPos(''); setNewEmail('')
    setMemberModal({ mode: 'add', defaultGroupId })
  }

  const openEditModal = (membershipId: string, groupId: string | null, role: string | null) => {
    setMemberGroupId(groupId ?? ''); setMemberRole(role ?? '')
    setMemberModal({ mode: 'edit', membershipId })
  }

  const saveMember = async () => {
    setSaving(true)
    try {
      if (memberModal?.mode === 'add') {
        let stakeholderId = selectedId
        if (creating && newName.trim()) {
          const s = await createStakeholder(data.project.workspace_id, {
            name: newName.trim(), position: newPos || null, email: newEmail || null,
          })
          stakeholderId = s.id
        }
        if (!stakeholderId) return
        await addStakeholderToProject(stakeholderId, data.project.id,
          memberGroupId || null, memberRole || null, data.projectStakeholders.length)
      } else if (memberModal?.membershipId) {
        await updateMembership(memberModal.membershipId, {
          group_id: memberGroupId || null, project_role: memberRole || null,
        })
      }
      onReload(); setMemberModal(null)
    } finally { setSaving(false) }
  }

  const removeMember = async (membershipId: string, name: string) => {
    if (!confirm(`Usuń „${name}" z tego projektu?`)) return
    await removeMembership(membershipId); onReload()
  }

  const filtered = allStakeholders.filter(s =>
    !projectStakeholderIds.has(s.id) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || (s.position ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  const membersByGroup = (groupId: string) => data.projectStakeholders.filter(s => s.groupId === groupId)
  const ungrouped = data.projectStakeholders.filter(s => !s.groupId)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">{t.projectStakeholders}</h2>
        <div className="flex gap-2">
          <button onClick={() => openAddModal()} className="btn-secondary text-sm">
            <UserPlus size={15} /> {t.addStakeholder}
          </button>
          <button onClick={() => setGroupModal({ mode: 'create' })} className="btn-primary text-sm">
            <Plus size={15} /> {t.newGroup}
          </button>
        </div>
      </div>

      {data.stakeholderGroups.length === 0 && data.projectStakeholders.length === 0 && (
        <div className="card p-10 text-center text-gray-400">
          {t.noStakeholders}
        </div>
      )}

      {data.stakeholderGroups.map(group => (
        <div key={group.id} className="card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 border-b border-purple-100 cursor-pointer"
            onClick={() => toggleGroup(group.id)}>
            {collapsed.has(group.id) ? <ChevronRight size={16} className="text-purple-500" /> : <ChevronDown size={16} className="text-purple-500" />}
            <span className="font-semibold text-purple-800 flex-1">{group.name}</span>
            <span className="text-xs text-purple-400">{t.people_count(membersByGroup(group.id).length)}</span>
            <button onClick={e => { e.stopPropagation(); setGName(group.name); setGroupModal({ mode: 'edit', group }) }}
              className="btn-ghost p-1 text-gray-500"><Pencil size={14} /></button>
            <button onClick={e => { e.stopPropagation(); removeGroup(group) }}
              className="btn-ghost p-1 text-gray-500 hover:text-red-600"><Trash2 size={14} /></button>
          </div>
          {!collapsed.has(group.id) && (
            <div>
              {membersByGroup(group.id).map(s => (
                <MemberRow key={s.membershipId} s={s}
                  onEdit={() => openEditModal(s.membershipId, s.groupId, s.projectRole)}
                  onRemove={() => removeMember(s.membershipId, s.name)} />
              ))}
              <div className="px-4 py-2.5">
                <button onClick={() => openAddModal(group.id)} className="btn-ghost text-xs text-purple-600">
                  <Plus size={13} /> {t.addToGroup}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {ungrouped.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.withoutGroup}</span>
          </div>
          {ungrouped.map(s => (
            <MemberRow key={s.membershipId} s={s}
              onEdit={() => openEditModal(s.membershipId, s.groupId, s.projectRole)}
              onRemove={() => removeMember(s.membershipId, s.name)} />
          ))}
        </div>
      )}

      {/* Group modal */}
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

      {/* Add/edit member modal */}
      {memberModal && (
        <Modal title={memberModal.mode === 'add' ? t.addStakeholder : t.editMembership}
          onClose={() => setMemberModal(null)} size="md">
          <div className="space-y-4">
            {memberModal.mode === 'add' && (
              <>
                <div className="flex gap-2 border-b border-gray-100 pb-3">
                  <button onClick={() => setCreating(false)}
                    className={`text-sm px-3 py-1 rounded-lg ${!creating ? 'btn-primary' : 'btn-ghost'}`}>
                    {t.addFromDirectory}
                  </button>
                  <button onClick={() => setCreating(true)}
                    className={`text-sm px-3 py-1 rounded-lg ${creating ? 'btn-primary' : 'btn-ghost'}`}>
                    {t.createNewPerson}
                  </button>
                </div>
                {!creating ? (
                  <div>
                    <div className="relative mb-2">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input className="input pl-8" placeholder={t.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} autoFocus />
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
                      {filtered.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">
                          {search ? t.noSearchResults : t.allStakeholdersAdded}
                        </p>
                      ) : filtered.map(s => (
                        <button key={s.id} onClick={() => setSelectedId(s.id)}
                          className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-center gap-2 ${selectedId === s.id ? 'bg-indigo-50' : ''}`}>
                          <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                            {s.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{s.name}</div>
                            {s.position && <div className="text-xs text-gray-400">{s.position}</div>}
                          </div>
                          {selectedId === s.id && <span className="ml-auto text-indigo-600 text-xs">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t.fullName} *</label>
                      <input className="input" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t.position}</label>
                        <input className="input" value={newPos} onChange={e => setNewPos(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t.email}</label>
                        <input className="input" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.stakeholderProjectGroup}</label>
                <select className="input" value={memberGroupId} onChange={e => setMemberGroupId(e.target.value)}>
                  <option value="">{t.noGroup}</option>
                  {data.stakeholderGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.projectRole}</label>
                <input className="input" value={memberRole} onChange={e => setMemberRole(e.target.value)}
                  placeholder={t.projectRolePlaceholder} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setMemberModal(null)} className="btn-secondary">{t.cancel}</button>
              <button
                onClick={saveMember}
                disabled={saving || (memberModal.mode === 'add' && !creating && !selectedId) || (creating && !newName.trim())}
                className="btn-primary">
                {saving ? <Spinner size={15} /> : null} {t.addMember}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function MemberRow({ s, onEdit, onRemove }: {
  s: import('../../types').ProjectStakeholder
  onEdit: () => void; onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 group">
      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
        {s.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-800 text-sm">{s.name}</div>
        <div className="flex gap-3 flex-wrap">
          {s.position && <span className="text-xs text-gray-500">{s.position}</span>}
          {s.projectRole && <span className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>{s.projectRole}</span>}
          {s.email && <span className="text-xs text-gray-400 flex items-center gap-1"><Mail size={10} />{s.email}</span>}
          {s.phone && <span className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} />{s.phone}</span>}
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="btn-ghost p-1 text-gray-500"><Pencil size={13} /></button>
        <button onClick={onRemove} className="btn-ghost p-1 text-gray-500 hover:text-red-600"><Trash2 size={13} /></button>
      </div>
    </div>
  )
}
