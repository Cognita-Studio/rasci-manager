export type RasciRole = 'R' | 'A' | 'S' | 'C' | 'I'

export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'completed'

export const PRIORITY_LABELS: Record<Priority, string> = {
  critical: 'Krytyczny',
  high: 'Wysoki',
  medium: 'Średni',
  low: 'Niski',
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'Nie rozpoczęte',
  in_progress: 'W toku',
  blocked: 'Zablokowane',
  completed: 'Ukończone',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-600',
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  not_started: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-800',
  blocked: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
}

export interface Workspace {
  id: string
  created_at: string
}

export interface Project {
  id: string
  workspace_id: string
  name: string
  description: string | null
  created_at: string
}

export interface TaskGroup {
  id: string
  project_id: string
  name: string
  order: number
}

export interface Task {
  id: string
  group_id: string
  name: string
  deadline: string | null
  priority: Priority | null
  status: TaskStatus
  order: number
}

export interface StakeholderGroup {
  id: string
  project_id: string
  name: string
  order: number
}

export interface Stakeholder {
  id: string
  group_id: string
  name: string
  email: string | null
  phone: string | null
  position: string | null
  project_role: string | null
  order: number
}

export interface RasciAssignment {
  id: string
  task_id: string
  stakeholder_id: string
  roles: RasciRole[]
}

export interface ProjectFull {
  project: Project
  taskGroups: (TaskGroup & { tasks: Task[] })[]
  stakeholderGroups: (StakeholderGroup & { stakeholders: Stakeholder[] })[]
  assignments: RasciAssignment[]
}
