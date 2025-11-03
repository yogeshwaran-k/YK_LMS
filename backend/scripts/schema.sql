-- Minimal tables to support new features (run in Supabase SQL editor)

-- Publish flag on courses
alter table if exists courses add column if not exists is_published boolean default true;
alter table if exists courses add column if not exists push_on_assign boolean default false;

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
  created_at timestamptz not null default now(),
  read_at timestamptz
);
-- Safe alters in case table exists without expected columns
alter table if exists notifications add column if not exists title text;
alter table if exists notifications add column if not exists body text;
alter table if exists notifications add column if not exists message text;
alter table if exists notifications add column if not exists created_at timestamptz default now();
alter table if exists notifications add column if not exists read_at timestamptz;
-- Relax legacy NOT NULL on message if present
do $$ begin
  if exists (select 1 from information_schema.columns where table_name='notifications' and column_name='message') then
    execute 'alter table notifications alter column message drop not null';
  end if;
end $$;

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
alter table if exists assessments add column if not exists push_on_assign boolean default false;
alter table if exists assessments add column if not exists eligibility_min_seconds integer default 0;

-- Scheduling, limits, and analysis controls
alter table if exists assessments add column if not exists start_at timestamptz;
alter table if exists assessments add column if not exists end_at timestamptz;
alter table if exists assessments add column if not exists allowed_attempts integer default 1;
alter table if exists assessments add column if not exists resume_limit integer default 0;
alter table if exists assessments add column if not exists show_results_immediately boolean default false;
alter table if exists assessments add column if not exists results_release_at timestamptz;
alter table if exists assessments add column if not exists results_force_enabled boolean default false;
-- Practice vs Test split
alter table if exists assessments add column if not exists is_practice boolean default false;
-- Proctoring controls
alter table if exists assessments add column if not exists disable_copy_paste boolean default false;
alter table if exists assessments add column if not exists tab_switch_limit integer;

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

-- Proctoring session events (tab switches, etc.)
create table if not exists assessment_proctor_events (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  session_id uuid not null references assessment_sessions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  event_type text not null check (event_type in ('tab_switch','copy','paste','cut','visibility_hidden')),
  created_at timestamptz not null default now()
);
create index if not exists idx_proctor_events_session on assessment_proctor_events(session_id);

-- Live snapshots for monitoring coding tests
create table if not exists assessment_live_snapshots (
  session_id uuid primary key references assessment_sessions(id) on delete cascade,
  assessment_id uuid not null references assessments(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  code text,
  last_report jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists idx_live_snapshots_assessment on assessment_live_snapshots(assessment_id);

-- Coding Question Banks
create table if not exists coding_question_banks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists coding_bank_questions (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references coding_question_banks(id) on delete cascade,
  title text not null,
  description text not null,
  starter_code text,
  difficulty text,
  marks integer default 10,
  created_at timestamptz not null default now()
);
create index if not exists idx_coding_bank_questions_bank on coding_bank_questions(bank_id);
