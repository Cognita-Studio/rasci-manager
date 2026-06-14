-- ============================================================
-- RASCI Manager – schemat bazy danych (Supabase / PostgreSQL)
-- Wklej całość w SQL Editor w panelu Supabase i wykonaj.
-- ============================================================

create extension if not exists "pgcrypto";

-- Workspaces (klucz dostępu użytkownika)
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
create index on projects(workspace_id);

-- Task groups
create table if not exists task_groups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  "order" int not null default 0
);
create index on task_groups(project_id);

-- Tasks
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
create index on tasks(group_id);

-- Stakeholder groups
create table if not exists stakeholder_groups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  "order" int not null default 0
);
create index on stakeholder_groups(project_id);

-- Stakeholders
create table if not exists stakeholders (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references stakeholder_groups(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  position text,
  project_role text,
  "order" int not null default 0
);
create index on stakeholders(group_id);

-- RASCI Assignments
create table if not exists rasci_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  stakeholder_id uuid not null references stakeholders(id) on delete cascade,
  roles text[] not null default '{}',
  unique(task_id, stakeholder_id)
);
create index on rasci_assignments(project_id);
create index on rasci_assignments(task_id);

-- ============================================================
-- Row Level Security
-- Wszystkie tabele są publiczne (brak auth) – dostęp przez UUID workspace.
-- Można opcjonalnie dodać RLS oparty na workspace_id jeśli potrzebna
-- będzie izolacja między użytkownikami.
-- ============================================================

alter table workspaces enable row level security;
alter table projects enable row level security;
alter table task_groups enable row level security;
alter table tasks enable row level security;
alter table stakeholder_groups enable row level security;
alter table stakeholders enable row level security;
alter table rasci_assignments enable row level security;

-- Polityki: pełny dostęp przez anon key (bezpieczeństwo przez UUID)
create policy "public access" on workspaces for all using (true) with check (true);
create policy "public access" on projects for all using (true) with check (true);
create policy "public access" on task_groups for all using (true) with check (true);
create policy "public access" on tasks for all using (true) with check (true);
create policy "public access" on stakeholder_groups for all using (true) with check (true);
create policy "public access" on stakeholders for all using (true) with check (true);
create policy "public access" on rasci_assignments for all using (true) with check (true);
