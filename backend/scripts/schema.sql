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

-- Assessments core fields (safe-add for legacy tables)
alter table if exists assessments add column if not exists title text;
alter table if exists assessments add column if not exists description text;
alter table if exists assessments add column if not exists type text; -- 'mcq' | 'coding' | 'assignment'
alter table if exists assessments add column if not exists duration_minutes integer default 60;
alter table if exists assessments add column if not exists total_marks integer default 100;
alter table if exists assessments add column if not exists passing_marks integer default 40;
alter table if exists assessments add column if not exists randomize_questions boolean default false;
alter table if exists assessments add column if not exists enable_negative_marking boolean default false;
alter table if exists assessments add column if not exists negative_marks_per_question numeric default 0;
alter table if exists assessments add column if not exists allowed_languages text[];

-- Scheduling, limits, and analysis controls
alter table if exists assessments add column if not exists start_at timestamptz;
alter table if exists assessments add column if not exists end_at timestamptz;
alter table if exists assessments add column if not exists allowed_attempts integer default 1;
alter table if exists assessments add column if not exists resume_limit integer default 0;
alter table if exists assessments add column if not exists show_results_immediately boolean default false;
alter table if exists assessments add column if not exists results_release_at timestamptz;
alter table if exists assessments add column if not exists results_force_enabled boolean default false;

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

-- Runtime assessment sessions to support resume limits and timers
create table if not exists assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'active', -- active | completed | cancelled
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  resume_count integer not null default 0,
  last_resume_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_assessment_sessions_user_assessment on assessment_sessions(user_id, assessment_id);

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

-- MCQ Question Banks
create table if not exists mcq_question_banks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists mcq_bank_questions (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references mcq_question_banks(id) on delete cascade,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('a','b','c','d')),
  marks integer not null default 1,
  difficulty text,
  topic text,
  explanation text,
  created_at timestamptz not null default now()
);
create index if not exists idx_mcq_bank_questions_bank on mcq_bank_questions(bank_id);
