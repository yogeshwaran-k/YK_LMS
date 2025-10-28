-- Minimal tables to support new features (run in Supabase SQL editor)

-- Course assignments
create table if not exists course_assignments (
  course_id uuid references courses(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  primary key (course_id, user_id)
);

-- Lesson progress
create table if not exists lesson_progress (
  user_id uuid references users(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete cascade,
  total_seconds integer not null default 0,
  primary key (user_id, lesson_id)
);

-- Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- Audit logs
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null,
  path text,
  method text,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- Submissions
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  assessment_id uuid not null references assessments(id) on delete cascade,
  type text not null, -- 'mcq' | 'coding' | 'assignment'
  score integer,
  payload jsonb,
  language text,
  started_at timestamptz,
  elapsed_seconds integer,
  question_ids jsonb,
  created_at timestamptz not null default now()
);

-- Assessments scheduling and limits
alter table if exists assessments add column if not exists start_at timestamptz;
alter table if exists assessments add column if not exists end_at timestamptz;
alter table if exists assessments add column if not exists allowed_attempts integer default 1;
alter table if exists assessments add column if not exists resume_limit integer default 0;

-- Safe alters for existing databases
alter table if exists submissions add column if not exists language text;
alter table if exists submissions add column if not exists started_at timestamptz;
alter table if exists submissions add column if not exists elapsed_seconds integer;
alter table if exists submissions add column if not exists question_ids jsonb;

-- Per-student assessment settings (optional overrides)
create table if not exists assessment_user_settings (
  assessment_id uuid references assessments(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  allowed_languages text[],
  max_attempts integer,
  resume_limit integer,
  start_at timestamptz,
  end_at timestamptz,
  primary key (assessment_id, user_id)
);

-- Learner groups
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  primary key (group_id, user_id)
);

-- Course assignments for groups
create table if not exists course_group_assignments (
  course_id uuid references courses(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,
  primary key (course_id, group_id)
);
