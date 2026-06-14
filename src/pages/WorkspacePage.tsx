import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, Trash2, Copy, Check } from 'lucide-react'
import { getOrCreateWorkspace, listProjects, createProject, deleteProject } from '../lib/db'
import type { Project } from '../types'
import Spinner from '../components/ui/Spinner'
import Modal from '../components/ui/Modal'

export default function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  useEffect(() => {
    if (!workspaceId) return
    getOrCreateWorkspace(workspaceId)
      .then(() => listProjects(workspaceId))
      .then(setProjects)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [workspaceId])

  const handleCreate = async () => {
    if (!newName.trim() || !workspaceId) return
    setSaving(true)
    try {
      const p = await createProject(workspaceId, newName.trim(), newDesc.trim())
      setProjects(prev => [p, ...prev])
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
      navigate(`/${workspaceId}/project/${p.id}`)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteProject(deleteTarget.id)
    setProjects(prev => prev.filter(p => p.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size={40} />
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center text-red-600">
      Błąd: {error}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-indigo-700">RASCI Manager</h1>
            <p className="text-xs text-gray-400 mt-0.5">Twoje projekty</p>
          </div>
          <div className="flex gap-2">
            <button onClick={copyLink} className="btn-secondary text-xs">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Skopiowano!' : 'Kopiuj link dostępu'}
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus size={16} /> Nowy projekt
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {projects.length === 0 ? (
          <div className="card p-12 text-center">
            <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-6">Nie masz jeszcze żadnych projektów.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus size={16} /> Utwórz pierwszy projekt
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map(p => (
              <div key={p.id} className="card p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/${workspaceId}/project/${p.id}`} className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                      {p.name}
                    </h2>
                    {p.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(p.created_at).toLocaleDateString('pl-PL')}
                    </p>
                  </Link>
                  <button
                    onClick={() => setDeleteTarget(p)}
                    className="btn-ghost p-1.5 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <Modal title="Nowy projekt" onClose={() => setShowCreate(false)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa projektu *</label>
              <input
                className="input"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="np. Wdrożenie systemu CRM"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opis (opcjonalny)</label>
              <textarea
                className="input resize-none"
                rows={3}
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Krótki opis projektu..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Anuluj</button>
              <button onClick={handleCreate} disabled={!newName.trim() || saving} className="btn-primary">
                {saving ? <Spinner size={16} /> : <Plus size={16} />}
                Utwórz
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Usuń projekt" onClose={() => setDeleteTarget(null)} size="sm">
          <p className="text-gray-600 mb-6">
            Czy na pewno chcesz usunąć projekt <strong>{deleteTarget.name}</strong>?
            Wszystkie dane zostaną trwale usunięte.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary">Anuluj</button>
            <button onClick={handleDelete} className="btn-danger">
              <Trash2 size={16} /> Usuń
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
