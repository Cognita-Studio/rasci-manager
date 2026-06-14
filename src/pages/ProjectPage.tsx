import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, LayoutGrid, Settings, Download, AlertTriangle } from 'lucide-react'
import { loadProjectFull } from '../lib/db'
import type { ProjectFull } from '../types'
import Spinner from '../components/ui/Spinner'
import DashboardView from '../components/dashboard/DashboardView'
import EditorView from '../components/project/EditorView'
import ValidationModal from '../components/dashboard/ValidationModal'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

type Tab = 'dashboard' | 'editor'

export default function ProjectPage() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>()
  const [data, setData] = useState<ProjectFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [showValidation, setShowValidation] = useState(false)
  const [exporting, setExporting] = useState(false)
  const dashboardRef = useRef<HTMLDivElement>(null)

  const load = () => {
    if (!projectId) return
    setLoading(true)
    loadProjectFull(projectId)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [projectId])

  const handleExportPNG = async () => {
    if (!dashboardRef.current) return
    setExporting(true)
    try {
      const canvas = await html2canvas(dashboardRef.current, { scale: 2, useCORS: true })
      const link = document.createElement('a')
      link.download = `${data?.project.name ?? 'rasci'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setExporting(false)
    }
  }

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return
    setExporting(true)
    try {
      const canvas = await html2canvas(dashboardRef.current, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 2, canvas.height / 2] })
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2)
      pdf.save(`${data?.project.name ?? 'rasci'}.pdf`)
    } finally {
      setExporting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><Spinner size={40} /></div>
  )
  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center text-red-600">
      {error ?? 'Nie znaleziono projektu'}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Link to={`/${workspaceId}`} className="btn-ghost p-1.5 rounded-lg text-gray-500">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 truncate">{data.project.name}</h1>
            {data.project.description && (
              <p className="text-xs text-gray-400 truncate">{data.project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {tab === 'dashboard' && (
              <>
                <button onClick={() => setShowValidation(true)} className="btn-secondary text-xs gap-1.5">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span className="hidden sm:inline">Walidacja</span>
                </button>
                <div className="relative group">
                  <button disabled={exporting} className="btn-secondary text-xs gap-1.5">
                    {exporting ? <Spinner size={14} /> : <Download size={14} />}
                    <span className="hidden sm:inline">Eksport</span>
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-36 card shadow-lg py-1 hidden group-hover:block z-50">
                    <button onClick={handleExportPNG} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">
                      Pobierz PNG
                    </button>
                    <button onClick={handleExportPDF} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">
                      Pobierz PDF
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto flex gap-1 mt-3">
          <button
            onClick={() => setTab('dashboard')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <LayoutGrid size={15} /> Dashboard
          </button>
          <button
            onClick={() => { setTab('editor'); load() }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === 'editor' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Settings size={15} /> Edytor
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-2 sm:px-4 py-6">
        {tab === 'dashboard' ? (
          <DashboardView ref={dashboardRef} data={data} />
        ) : (
          <EditorView data={data} onReload={load} />
        )}
      </main>

      {showValidation && (
        <ValidationModal data={data} onClose={() => setShowValidation(false)} />
      )}
    </div>
  )
}
