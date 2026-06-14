import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const LS_WORKSPACE = 'rasci_workspace_id'

export function getWorkspaceId() {
  // 1. URL param takes priority (?w=UUID) — allows cross-device sharing
  const params = new URLSearchParams(window.location.search)
  const urlId = params.get('w')
  if (urlId && urlId.length > 10) {
    localStorage.setItem(LS_WORKSPACE, urlId)
    return urlId
  }
  // 2. Fallback to localStorage
  let id = localStorage.getItem(LS_WORKSPACE)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(LS_WORKSPACE, id)
  }
  // 3. Keep URL in sync
  params.set('w', id)
  const newUrl = window.location.pathname + '?' + params.toString()
  window.history.replaceState(null, '', newUrl)
  return id
}

export async function loadFromCloud(workspaceId) {
  const { data, error } = await supabase
    .from('schedule_data')
    .select('data')
    .eq('workspace_id', workspaceId)
    .single()
  if (error || !data) return null
  return data.data
}

export async function saveToCloud(workspaceId, yearData) {
  const { error } = await supabase
    .from('schedule_data')
    .upsert(
      { workspace_id: workspaceId, data: yearData, updated_at: new Date().toISOString() },
      { onConflict: 'workspace_id' }
    )
  return !error
}
