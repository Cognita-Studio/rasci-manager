import { supabase } from './supabase'
import type {
  Workspace, Project, TaskGroup, Task,
  StakeholderGroup, Stakeholder, ProjectFull
} from '../types'

// ── Workspace ──────────────────────────────────────────────

export async function getOrCreateWorkspace(id: string): Promise<Workspace> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) {
    const { data: created, error: ce } = await supabase
      .from('workspaces')
      .insert({ id })
      .select()
      .single()
    if (ce || !created) throw new Error('Cannot create workspace')
    return created
  }
  return data
}

// ── Projects ───────────────────────────────────────────────

export async function listProjects(workspaceId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createProject(workspaceId: string, name: string, description: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({ workspace_id: workspaceId, name, description })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProject(id: string, name: string, description: string): Promise<void> {
  const { error } = await supabase.from('projects').update({ name, description }).eq('id', id)
  if (error) throw error
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}

// ── Full project load ──────────────────────────────────────

export async function loadProjectFull(projectId: string): Promise<ProjectFull> {
  const [projRes, tgRes, sgRes, assignRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('task_groups').select('*, tasks(*)').eq('project_id', projectId).order('order'),
    supabase.from('stakeholder_groups').select('*, stakeholders(*)').eq('project_id', projectId).order('order'),
    supabase.from('rasci_assignments').select('*').eq('project_id', projectId),
  ])
  if (projRes.error) throw projRes.error
  const taskGroups = (tgRes.data ?? []).map((g: TaskGroup & { tasks: Task[] }) => ({
    ...g,
    tasks: (g.tasks ?? []).sort((a: Task, b: Task) => a.order - b.order),
  }))
  const stakeholderGroups = (sgRes.data ?? []).map((g: StakeholderGroup & { stakeholders: Stakeholder[] }) => ({
    ...g,
    stakeholders: (g.stakeholders ?? []).sort((a: Stakeholder, b: Stakeholder) => a.order - b.order),
  }))
  return {
    project: projRes.data,
    taskGroups,
    stakeholderGroups,
    assignments: assignRes.data ?? [],
  }
}

// ── Task Groups ────────────────────────────────────────────

export async function createTaskGroup(projectId: string, name: string, order: number): Promise<TaskGroup> {
  const { data, error } = await supabase
    .from('task_groups')
    .insert({ project_id: projectId, name, order })
    .select().single()
  if (error) throw error
  return data
}

export async function updateTaskGroup(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('task_groups').update({ name }).eq('id', id)
  if (error) throw error
}

export async function deleteTaskGroup(id: string): Promise<void> {
  const { error } = await supabase.from('task_groups').delete().eq('id', id)
  if (error) throw error
}

// ── Tasks ──────────────────────────────────────────────────

export async function createTask(groupId: string, name: string, order: number): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ group_id: groupId, name, order, status: 'not_started' })
    .select().single()
  if (error) throw error
  return data
}

export async function updateTask(id: string, fields: Partial<Omit<Task, 'id' | 'group_id'>>): Promise<void> {
  const { error } = await supabase.from('tasks').update(fields).eq('id', id)
  if (error) throw error
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

// ── Stakeholder Groups ─────────────────────────────────────

export async function createStakeholderGroup(projectId: string, name: string, order: number): Promise<StakeholderGroup> {
  const { data, error } = await supabase
    .from('stakeholder_groups')
    .insert({ project_id: projectId, name, order })
    .select().single()
  if (error) throw error
  return data
}

export async function updateStakeholderGroup(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('stakeholder_groups').update({ name }).eq('id', id)
  if (error) throw error
}

export async function deleteStakeholderGroup(id: string): Promise<void> {
  const { error } = await supabase.from('stakeholder_groups').delete().eq('id', id)
  if (error) throw error
}

// ── Stakeholders ───────────────────────────────────────────

export async function createStakeholder(
  groupId: string,
  fields: Omit<Stakeholder, 'id' | 'group_id' | 'order'>,
  order: number
): Promise<Stakeholder> {
  const { data, error } = await supabase
    .from('stakeholders')
    .insert({ group_id: groupId, ...fields, order })
    .select().single()
  if (error) throw error
  return data
}

export async function updateStakeholder(id: string, fields: Partial<Omit<Stakeholder, 'id' | 'group_id'>>): Promise<void> {
  const { error } = await supabase.from('stakeholders').update(fields).eq('id', id)
  if (error) throw error
}

export async function deleteStakeholder(id: string): Promise<void> {
  const { error } = await supabase.from('stakeholders').delete().eq('id', id)
  if (error) throw error
}

// ── RASCI Assignments ──────────────────────────────────────

export async function upsertAssignment(
  projectId: string,
  taskId: string,
  stakeholderId: string,
  roles: string[]
): Promise<void> {
  if (roles.length === 0) {
    await supabase
      .from('rasci_assignments')
      .delete()
      .eq('task_id', taskId)
      .eq('stakeholder_id', stakeholderId)
    return
  }
  const { error } = await supabase
    .from('rasci_assignments')
    .upsert(
      { project_id: projectId, task_id: taskId, stakeholder_id: stakeholderId, roles },
      { onConflict: 'task_id,stakeholder_id' }
    )
  if (error) throw error
}
