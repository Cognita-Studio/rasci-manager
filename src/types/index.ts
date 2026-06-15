export type RasciRole = 'R' | 'A' | 'S' | 'C' | 'I'
export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'completed'
export type RiskStatus = 'open' | 'monitoring' | 'mitigated' | 'closed'

export const PRIORITY_LABELS: Record<Priority, string> = {
  critical: 'Krytyczny', high: 'Wysoki', medium: 'Średni', low: 'Niski',
}
export const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'Nie rozpoczęte', in_progress: 'W toku',
  blocked: 'Zablokowane', completed: 'Ukończone',
}
export const PRIORITY_COLORS: Record<Priority, string> = {
  critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800', low: 'bg-gray-100 text-gray-600',
}
export const STATUS_COLORS: Record<TaskStatus, string> = {
  not_started: 'bg-gray-100 text-gray-600', in_progress: 'bg-blue-100 text-blue-800',
  blocked: 'bg-red-100 text-red-800', completed: 'bg-green-100 text-green-800',
}
export const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  open: 'Otwarte', monitoring: 'Obserwowane', mitigated: 'Zmitygowane', closed: 'Zamknięte',
}
export const RISK_STATUS_COLORS: Record<RiskStatus, string> = {
  open: 'bg-red-100 text-red-700',
  monitoring: 'bg-yellow-100 text-yellow-700',
  mitigated: 'bg-blue-100 text-blue-700',
  closed: 'bg-gray-100 text-gray-500',
}

export function riskScoreColor(score: number): string {
  if (score >= 17) return 'bg-red-600 text-white'
  if (score >= 10) return 'bg-orange-400 text-white'
  if (score >= 5)  return 'bg-yellow-400 text-gray-900'
  return 'bg-green-400 text-white'
}
export function riskScoreLabel(score: number): string {
  if (score >= 17) return 'Krytyczne'
  if (score >= 10) return 'Wysokie'
  if (score >= 5)  return 'Średnie'
  return 'Niskie'
}

export interface Workspace { id: string; created_at: string }
export interface Project { id: string; workspace_id: string; name: string; description: string | null; created_at: string }

export interface TaskGroup { id: string; project_id: string; name: string; order: number }
export interface Task {
  id: string; group_id: string; name: string; deadline: string | null
  priority: Priority | null; status: TaskStatus; order: number
}

// Global stakeholder (workspace level)
export interface Stakeholder {
  id: string; workspace_id: string; name: string
  email: string | null; phone: string | null; position: string | null; created_at: string
}

export interface StakeholderGroup { id: string; project_id: string; name: string; order: number }

// Stakeholder as it appears in a project (membership + global data merged)
export interface ProjectStakeholder {
  membershipId: string
  stakeholderId: string
  groupId: string | null
  projectRole: string | null
  order: number
  name: string
  email: string | null
  phone: string | null
  position: string | null
}

export interface RasciAssignment { id: string; project_id: string; task_id: string; stakeholder_id: string; roles: RasciRole[] }

export interface RiskCategory { id: string; project_id: string; name: string; color: string; order: number }

export interface Risk {
  id: string; project_id: string; title: string; description: string | null
  category_id: string | null; probability: number; impact: number; score: number
  status: RiskStatus; owner_id: string | null; mitigation_plan: string | null
  review_deadline: string | null; created_at: string; updated_at: string
}

export interface RiskTaskLink { risk_id: string; task_id: string }

export interface RiskHistory {
  id: string; risk_id: string; changed_at: string; field: string
  old_value: string | null; new_value: string | null
}

export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  open: 'Otwarte', in_progress: 'W trakcie', resolved: 'Rozwiązane', closed: 'Zamknięte',
}
export const ISSUE_STATUS_COLORS: Record<IssueStatus, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
}

export interface IssueCategory { id: string; project_id: string; name: string; color: string; order: number }

export interface Issue {
  id: string; project_id: string; title: string; description: string | null
  category_id: string | null; status: IssueStatus; priority: Priority | null
  owner_id: string | null; deadline: string | null
  created_at: string; updated_at: string
}

export interface IssueTaskLink { issue_id: string; task_id: string }
export interface IssueRiskLink { issue_id: string; risk_id: string }

export interface IssueHistory {
  id: string; issue_id: string; changed_at: string; field: string
  old_value: string | null; new_value: string | null
}

export const DEFAULT_ISSUE_CATEGORIES = [
  { name: 'Błąd / Bug',         color: '#ef4444' },
  { name: 'Zmiana zakresu',     color: '#f97316' },
  { name: 'Zależność',          color: '#3b82f6' },
  { name: 'Zasoby',             color: '#8b5cf6' },
  { name: 'Komunikacja',        color: '#10b981' },
]

export const DEFAULT_RISK_CATEGORIES = [
  { name: 'Techniczne',      color: '#3b82f6' },
  { name: 'Finansowe',       color: '#f59e0b' },
  { name: 'Organizacyjne',   color: '#8b5cf6' },
  { name: 'Zewnętrzne',      color: '#10b981' },
  { name: 'Prawne',          color: '#ef4444' },
]

export interface ProjectFull {
  project: Project
  taskGroups: (TaskGroup & { tasks: Task[] })[]
  stakeholderGroups: StakeholderGroup[]
  projectStakeholders: ProjectStakeholder[]
  assignments: RasciAssignment[]
  risks: Risk[]
  riskCategories: RiskCategory[]
  riskTaskLinks: RiskTaskLink[]
  issues: Issue[]
  issueCategories: IssueCategory[]
  issueTaskLinks: IssueTaskLink[]
  issueRiskLinks: IssueRiskLink[]
}
