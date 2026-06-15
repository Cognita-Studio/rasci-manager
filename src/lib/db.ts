import { supabase } from './supabase'
import type {
  Workspace, Project, TaskGroup, Task, Stakeholder,
  StakeholderGroup, ProjectStakeholder, ProjectFull,
  RiskCategory, Risk, RiskHistory,
} from '../types'
import { DEFAULT_RISK_CATEGORIES as DEFAULTS } from '../types'

// ── Workspace ──────────────────────────────────────────────
export async function getOrCreateWorkspace(id: string): Promise<Workspace> {
  const { data, error } = await supabase.from('workspaces').select('*').eq('id', id).single()
  if (error || !data) {
    const { data: created, error: ce } = await supabase.from('workspaces').insert({ id }).select().single()
    if (ce || !created) throw new Error('Cannot create workspace')
    return created
  }
  return data
}

// ── Projects ───────────────────────────────────────────────
export async function listProjects(workspaceId: string): Promise<Project[]> {
  const { data, error } = await supabase.from('projects').select('*')
    .eq('workspace_id', workspaceId).order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createProject(workspaceId: string, name: string, description: string): Promise<Project> {
  const { data, error } = await supabase.from('projects')
    .insert({ workspace_id: workspaceId, name, description }).select().single()
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
  const [projRes, tgRes, sgRes, mbrRes, assignRes, riskRes, rcRes, rtlRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('task_groups').select('*, tasks(*)').eq('project_id', projectId).order('order'),
    supabase.from('stakeholder_groups').select('*').eq('project_id', projectId).order('order'),
    supabase.from('project_stakeholder_memberships')
      .select('*, stakeholder:stakeholders(id,name,email,phone,position)')
      .eq('project_id', projectId).order('order'),
    supabase.from('rasci_assignments').select('*').eq('project_id', projectId),
    supabase.from('risks').select('*').eq('project_id', projectId).order('created_at'),
    supabase.from('risk_categories').select('*').eq('project_id', projectId).order('order'),
    supabase.from('risk_task_links').select('risk_id,task_id'),
  ])
  if (projRes.error) throw projRes.error

  const taskGroups = (tgRes.data ?? []).map((g: TaskGroup & { tasks: Task[] }) => ({
    ...g, tasks: (g.tasks ?? []).sort((a: Task, b: Task) => a.order - b.order),
  }))

  const projectStakeholders: ProjectStakeholder[] = (mbrRes.data ?? []).map((m: {
    id: string; stakeholder_id: string; group_id: string | null; project_role: string | null; order: number
    stakeholder: { id: string; name: string; email: string | null; phone: string | null; position: string | null }
  }) => ({
    membershipId: m.id,
    stakeholderId: m.stakeholder_id,
    groupId: m.group_id,
    projectRole: m.project_role,
    order: m.order,
    name: m.stakeholder.name,
    email: m.stakeholder.email,
    phone: m.stakeholder.phone,
    position: m.stakeholder.position,
  }))

  // Filter risk_task_links to only those relevant to this project's risks
  const projectRiskIds = new Set((riskRes.data ?? []).map((r: Risk) => r.id))
  const riskTaskLinks = (rtlRes.data ?? []).filter((l: { risk_id: string }) => projectRiskIds.has(l.risk_id))

  return {
    project: projRes.data,
    taskGroups,
    stakeholderGroups: sgRes.data ?? [],
    projectStakeholders,
    assignments: assignRes.data ?? [],
    risks: riskRes.data ?? [],
    riskCategories: rcRes.data ?? [],
    riskTaskLinks,
  }
}

// ── Task Groups ────────────────────────────────────────────
export async function createTaskGroup(projectId: string, name: string, order: number): Promise<TaskGroup> {
  const { data, error } = await supabase.from('task_groups')
    .insert({ project_id: projectId, name, order }).select().single()
  if (error) throw error; return data
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
  const { data, error } = await supabase.from('tasks')
    .insert({ group_id: groupId, name, order, status: 'not_started' }).select().single()
  if (error) throw error; return data
}
export async function updateTask(id: string, fields: Partial<Omit<Task, 'id' | 'group_id'>>): Promise<void> {
  const { error } = await supabase.from('tasks').update(fields).eq('id', id)
  if (error) throw error
}
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

// ── Global Stakeholders (workspace) ───────────────────────
export async function listStakeholders(workspaceId: string): Promise<Stakeholder[]> {
  const { data, error } = await supabase.from('stakeholders').select('*')
    .eq('workspace_id', workspaceId).order('name')
  if (error) throw error; return data ?? []
}

export async function createStakeholder(workspaceId: string, fields: {
  name: string; email?: string | null; phone?: string | null; position?: string | null
}): Promise<Stakeholder> {
  const { data, error } = await supabase.from('stakeholders')
    .insert({ workspace_id: workspaceId, ...fields }).select().single()
  if (error) throw error; return data
}

export async function updateStakeholder(id: string, fields: {
  name?: string; email?: string | null; phone?: string | null; position?: string | null
}): Promise<void> {
  const { error } = await supabase.from('stakeholders').update(fields).eq('id', id)
  if (error) throw error
}

export async function deleteStakeholder(id: string): Promise<void> {
  const { error } = await supabase.from('stakeholders').delete().eq('id', id)
  if (error) throw error
}

// ── Stakeholder Groups ─────────────────────────────────────
export async function createStakeholderGroup(projectId: string, name: string, order: number): Promise<StakeholderGroup> {
  const { data, error } = await supabase.from('stakeholder_groups')
    .insert({ project_id: projectId, name, order }).select().single()
  if (error) throw error; return data
}
export async function updateStakeholderGroup(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('stakeholder_groups').update({ name }).eq('id', id)
  if (error) throw error
}
export async function deleteStakeholderGroup(id: string): Promise<void> {
  const { error } = await supabase.from('stakeholder_groups').delete().eq('id', id)
  if (error) throw error
}

// ── Project Stakeholder Memberships ────────────────────────
export async function addStakeholderToProject(
  stakeholderId: string, projectId: string,
  groupId: string | null, projectRole: string | null, order: number
): Promise<void> {
  const { error } = await supabase.from('project_stakeholder_memberships')
    .insert({ stakeholder_id: stakeholderId, project_id: projectId, group_id: groupId, project_role: projectRole, order })
  if (error) throw error
}

export async function updateMembership(membershipId: string, fields: {
  group_id?: string | null; project_role?: string | null
}): Promise<void> {
  const { error } = await supabase.from('project_stakeholder_memberships').update(fields).eq('id', membershipId)
  if (error) throw error
}

export async function removeMembership(membershipId: string): Promise<void> {
  const { error } = await supabase.from('project_stakeholder_memberships').delete().eq('id', membershipId)
  if (error) throw error
}

// ── RASCI Assignments ──────────────────────────────────────
export async function upsertAssignment(
  projectId: string, taskId: string, stakeholderId: string, roles: string[]
): Promise<void> {
  if (roles.length === 0) {
    await supabase.from('rasci_assignments').delete().eq('task_id', taskId).eq('stakeholder_id', stakeholderId)
    return
  }
  const { error } = await supabase.from('rasci_assignments')
    .upsert({ project_id: projectId, task_id: taskId, stakeholder_id: stakeholderId, roles },
      { onConflict: 'task_id,stakeholder_id' })
  if (error) throw error
}

// ── Risk Categories ────────────────────────────────────────
export async function createDefaultRiskCategories(projectId: string): Promise<void> {
  const rows = DEFAULTS.map((c, i) => ({ project_id: projectId, name: c.name, color: c.color, order: i }))
  await supabase.from('risk_categories').insert(rows)
}

export async function createRiskCategory(projectId: string, name: string, color: string, order: number): Promise<RiskCategory> {
  const { data, error } = await supabase.from('risk_categories')
    .insert({ project_id: projectId, name, color, order }).select().single()
  if (error) throw error; return data
}

export async function updateRiskCategory(id: string, fields: Partial<Pick<RiskCategory, 'name' | 'color' | 'order'>>): Promise<void> {
  const { error } = await supabase.from('risk_categories').update(fields).eq('id', id)
  if (error) throw error
}

export async function deleteRiskCategory(id: string): Promise<void> {
  const { error } = await supabase.from('risk_categories').delete().eq('id', id)
  if (error) throw error
}

// ── Risks ──────────────────────────────────────────────────
export async function createRisk(projectId: string, fields: {
  title: string; description?: string | null; category_id?: string | null
  probability: number; impact: number; status: string
  owner_id?: string | null; mitigation_plan?: string | null; review_deadline?: string | null
}): Promise<Risk> {
  const { data, error } = await supabase.from('risks')
    .insert({ project_id: projectId, ...fields }).select().single()
  if (error) throw error; return data
}

export async function updateRisk(
  id: string,
  fields: Partial<Omit<Risk, 'id' | 'project_id' | 'score' | 'created_at' | 'updated_at'>>,
  history?: { field: string; old_value: string | null; new_value: string | null }[]
): Promise<void> {
  const { error } = await supabase.from('risks')
    .update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
  if (history && history.length > 0) {
    await supabase.from('risk_history').insert(
      history.map(h => ({ risk_id: id, ...h }))
    )
  }
}

export async function deleteRisk(id: string): Promise<void> {
  const { error } = await supabase.from('risks').delete().eq('id', id)
  if (error) throw error
}

// ── Risk-Task Links ────────────────────────────────────────
export async function setRiskTaskLinks(riskId: string, taskIds: string[]): Promise<void> {
  await supabase.from('risk_task_links').delete().eq('risk_id', riskId)
  if (taskIds.length > 0) {
    await supabase.from('risk_task_links').insert(taskIds.map(tid => ({ risk_id: riskId, task_id: tid })))
  }
}

// ── Risk History ───────────────────────────────────────────
export async function loadRiskHistory(riskId: string): Promise<RiskHistory[]> {
  const { data, error } = await supabase.from('risk_history').select('*')
    .eq('risk_id', riskId).order('changed_at', { ascending: false })
  if (error) throw error; return data ?? []
}
