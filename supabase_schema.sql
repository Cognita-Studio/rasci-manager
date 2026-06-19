-- ============================================================
-- RASCI Manager — pełny schemat bazy danych v2
-- Wklej całość w SQL Editor Supabase i wykonaj.
-- UWAGA: usuwa stare tabele stakeholderów (brak danych do migracji)
-- ============================================================

create extension if not exists "pgcrypto";

-- ── Workspaces ─────────────────────────────────────────────
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- ── Projects ───────────────────────────────────────────────
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists projects_workspace_id_idx on projects(workspace_id);

-- ── Task groups & tasks ────────────────────────────────────
create table if not exists task_groups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  "order" int not null default 0
);
create index if not exists task_groups_project_id_idx on task_groups(project_id);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references task_groups(id) on delete cascade,
  name text not null,
  deadline date,
  priority text check (priority in ('critical','high','medium','low')),
  status text not null default 'not_started'
    check (status in ('not_started','in_progress','blocked','completed')),
  "order" int not null default 0
);
create index if not exists tasks_group_id_idx on tasks(group_id);

-- ── Global stakeholders (workspace level) ─────────────────
drop table if exists rasci_assignments cascade;
drop table if exists stakeholders cascade;
drop table if exists stakeholder_groups cascade;

create table stakeholders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  position text,
  created_at timestamptz not null default now()
);
create index stakeholders_workspace_id_idx on stakeholders(workspace_id);

-- ── Stakeholder groups (per project) ──────────────────────
create table stakeholder_groups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  "order" int not null default 0
);
create index stakeholder_groups_project_id_idx on stakeholder_groups(project_id);

-- ── Project stakeholder memberships ───────────────────────
-- Links global stakeholders to projects with per-project role & group
create table project_stakeholder_memberships (
  id uuid primary key default gen_random_uuid(),
  stakeholder_id uuid not null references stakeholders(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  group_id uuid references stakeholder_groups(id) on delete set null,
  project_role text,
  "order" int not null default 0,
  unique(stakeholder_id, project_id)
);
create index psm_project_id_idx on project_stakeholder_memberships(project_id);
create index psm_stakeholder_id_idx on project_stakeholder_memberships(stakeholder_id);

-- ── RASCI Assignments ──────────────────────────────────────
create table rasci_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  stakeholder_id uuid not null references stakeholders(id) on delete cascade,
  roles text[] not null default '{}',
  unique(task_id, stakeholder_id)
);
create index rasci_project_id_idx on rasci_assignments(project_id);
create index rasci_task_id_idx on rasci_assignments(task_id);

-- ── Risk categories (per project, editable) ───────────────
create table risk_categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  color text not null default '#6b7280',
  "order" int not null default 0
);
create index risk_categories_project_id_idx on risk_categories(project_id);

-- ── Risks ──────────────────────────────────────────────────
create table risks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  category_id uuid references risk_categories(id) on delete set null,
  probability int not null default 1 check (probability between 1 and 5),
  impact int not null default 1 check (impact between 1 and 5),
  score int generated always as (probability * impact) stored,
  status text not null default 'open'
    check (status in ('open','monitoring','mitigated','closed')),
  owner_id uuid references stakeholders(id) on delete set null,
  mitigation_plan text,
  review_deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index risks_project_id_idx on risks(project_id);

-- ── Risk ↔ Task links (many-to-many) ──────────────────────
create table risk_task_links (
  risk_id uuid not null references risks(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  primary key (risk_id, task_id)
);

-- ── Risk history (simple) ──────────────────────────────────
create table risk_history (
  id uuid primary key default gen_random_uuid(),
  risk_id uuid not null references risks(id) on delete cascade,
  changed_at timestamptz not null default now(),
  field text not null,
  old_value text,
  new_value text
);
create index risk_history_risk_id_idx on risk_history(risk_id);

-- ── Yearly Schedule ────────────────────────────────────────
create table if not exists schedule_data (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique,
  data jsonb not null default '{"version":1,"years":{}}',
  updated_at timestamptz not null default now()
);

-- ── Row Level Security ─────────────────────────────────────
alter table workspaces enable row level security;
alter table projects enable row level security;
alter table task_groups enable row level security;
alter table tasks enable row level security;
alter table stakeholders enable row level security;
alter table stakeholder_groups enable row level security;
alter table project_stakeholder_memberships enable row level security;
alter table rasci_assignments enable row level security;
alter table risk_categories enable row level security;
alter table risks enable row level security;
alter table risk_task_links enable row level security;
alter table risk_history enable row level security;
alter table schedule_data enable row level security;

do $$ begin
  create policy "public access" on workspaces for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public access" on projects for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public access" on task_groups for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public access" on tasks for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public access" on stakeholders for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public access" on stakeholder_groups for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public access" on project_stakeholder_memberships for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public access" on rasci_assignments for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public access" on risk_categories for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public access" on risks for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public access" on risk_task_links for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public access" on risk_history for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public access" on schedule_data for all using (true) with check (true);
exception when duplicate_object then null; end $$;

-- ── Issue Categories ────────────────────────────────────────
create table if not exists issue_categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  color text not null default '#6b7280',
  "order" int not null default 0
);

-- ── Issues ──────────────────────────────────────────────────
create table if not exists issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  category_id uuid references issue_categories(id) on delete set null,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  priority text check (priority in ('critical','high','medium','low')),
  owner_id uuid references stakeholders(id) on delete set null,
  deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Issue ↔ Task links ──────────────────────────────────────
create table if not exists issue_task_links (
  issue_id uuid not null references issues(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  primary key (issue_id, task_id)
);

-- ── Issue ↔ Risk links ──────────────────────────────────────
create table if not exists issue_risk_links (
  issue_id uuid not null references issues(id) on delete cascade,
  risk_id uuid not null references risks(id) on delete cascade,
  primary key (issue_id, risk_id)
);

-- ── Issue History ────────────────────────────────────────────
create table if not exists issue_history (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  changed_at timestamptz not null default now(),
  field text not null,
  old_value text,
  new_value text
);

-- ── RLS for issue tables ─────────────────────────────────────
alter table issue_categories enable row level security;
alter table issues enable row level security;
alter table issue_task_links enable row level security;
alter table issue_risk_links enable row level security;
alter table issue_history enable row level security;

do $$ begin
  create policy "public access" on issue_categories for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public access" on issues for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public access" on issue_task_links for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public access" on issue_risk_links for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public access" on issue_history for all using (true) with check (true);
exception when duplicate_object then null; end $$;

-- ── Task Steps ───────────────────────────────────────────────
create table if not exists task_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  name text not null,
  status text not null default 'not_started' check (status in ('not_started','in_progress','blocked','completed')),
  "order" int not null default 0
);

alter table task_steps enable row level security;

do $$ begin
  create policy "public access" on task_steps for all using (true) with check (true);
exception when duplicate_object then null; end $$;
