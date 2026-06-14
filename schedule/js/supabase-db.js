import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const LS_WORKSPACE = 'rasci_workspace_id'

export function getWorkspaceId() {
  let id = localStorage.getItem(LS_WORKSPACE)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(LS_WORKSPACE, id)
  }
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
