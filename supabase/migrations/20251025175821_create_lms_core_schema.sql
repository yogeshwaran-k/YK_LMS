/*
  # LMS Core Database Schema

  ## Overview
  This migration creates the foundational database structure for a comprehensive Learning Management System
  designed for college/university students to practice labs, exams, and placement preparation.

  ## 1. New Tables

  ### 1.1 users
  - `id` (uuid, primary key) - Unique user identifier
  - `email` (text, unique) - User email address
  - `password_hash` (text) - Securely hashed password
  - `role` (text) - User role: 'super_admin', 'admin', or 'student'
  - `full_name` (text) - User's full name
  - `is_active` (boolean) - Account active status
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  - `last_login` (timestamptz) - Last login timestamp

  ### 1.2 courses
  - `id` (uuid, primary key) - Unique course identifier
  - `title` (text) - Course title
  - `description` (text) - Detailed course description
  - `category` (text) - Course category (labs, exams, aptitude, communication, coding)
  - `created_by` (uuid, foreign key) - Admin who created the course
  - `is_published` (boolean) - Course visibility status
  - `enable_certificates` (boolean) - Certificate generation enabled
  - `enable_gamification` (boolean) - Gamification features enabled
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 1.3 modules
  - `id` (uuid, primary key) - Unique module identifier
  - `course_id` (uuid, foreign key) - Parent course
  - `title` (text) - Module title
  - `description` (text) - Module description
  - `order_index` (integer) - Display order within course
  - `min_time_minutes` (integer) - Minimum time required for completion
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 1.4 lessons
  - `id` (uuid, primary key) - Unique lesson identifier
  - `module_id` (uuid, foreign key) - Parent module
  - `title` (text) - Lesson title
  - `content_type` (text) - Content type: 'text', 'video', 'pdf', 'ppt', 'coding'
  - `content_url` (text) - Cloud storage URL for content
  - `content_text` (text) - Text content for text-based lessons
  - `order_index` (integer) - Display order within module
  - `min_time_minutes` (integer) - Minimum time to spend on lesson
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 1.5 assessments
  - `id` (uuid, primary key) - Unique assessment identifier
  - `module_id` (uuid, foreign key) - Parent module
  - `title` (text) - Assessment title
  - `type` (text) - Assessment type: 'mcq', 'coding', 'assignment'
  - `description` (text) - Assessment instructions
  - `duration_minutes` (integer) - Time limit for assessment
  - `total_marks` (integer) - Maximum possible score
  - `passing_marks` (integer) - Minimum score to pass
  - `randomize_questions` (boolean) - Randomize question order
  - `enable_negative_marking` (boolean) - Enable negative marking
  - `negative_marks_per_question` (decimal) - Points deducted for wrong answers
  - `show_results_immediately` (boolean) - Show results after submission
  - `deadline` (timestamptz) - Submission deadline
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 1.6 mcq_questions
  - `id` (uuid, primary key) - Unique question identifier
  - `assessment_id` (uuid, foreign key) - Parent assessment
  - `question_text` (text) - Question content
  - `option_a` (text) - Option A
  - `option_b` (text) - Option B
  - `option_c` (text) - Option C
  - `option_d` (text) - Option D
  - `correct_option` (text) - Correct answer: 'a', 'b', 'c', or 'd'
  - `marks` (integer) - Points for correct answer
  - `difficulty` (text) - Difficulty level: 'easy', 'medium', 'hard'
  - `topic` (text) - Question topic/tag
  - `explanation` (text) - Explanation for the answer
  - `created_at` (timestamptz) - Creation timestamp

  ### 1.7 coding_questions
  - `id` (uuid, primary key) - Unique question identifier
  - `assessment_id` (uuid, foreign key) - Parent assessment
  - `title` (text) - Problem title
  - `description` (text) - Problem statement
  - `difficulty` (text) - Difficulty level
  - `marks` (integer) - Points for correct solution
  - `time_limit_seconds` (integer) - Execution time limit
  - `memory_limit_mb` (integer) - Memory limit
  - `starter_code` (text) - Initial code template
  - `created_at` (timestamptz) - Creation timestamp

  ### 1.8 test_cases
  - `id` (uuid, primary key) - Unique test case identifier
  - `coding_question_id` (uuid, foreign key) - Parent coding question
  - `input` (text) - Test case input
  - `expected_output` (text) - Expected output
  - `is_hidden` (boolean) - Hidden from students
  - `weightage` (integer) - Points for passing this test case
  - `created_at` (timestamptz) - Creation timestamp

  ### 1.9 assignments
  - `id` (uuid, primary key) - Unique assignment identifier
  - `assessment_id` (uuid, foreign key) - Parent assessment
  - `title` (text) - Assignment title
  - `description` (text) - Assignment instructions
  - `max_file_size_mb` (integer) - Maximum file size
  - `allowed_file_types` (text[]) - Allowed file extensions
  - `deadline` (timestamptz) - Submission deadline
  - `created_at` (timestamptz) - Creation timestamp

  ### 1.10 student_courses
  - `id` (uuid, primary key) - Unique enrollment identifier
  - `student_id` (uuid, foreign key) - Student user
  - `course_id` (uuid, foreign key) - Enrolled course
  - `assigned_by` (uuid, foreign key) - Admin who assigned the course
  - `enrolled_at` (timestamptz) - Enrollment timestamp
  - `completed_at` (timestamptz) - Completion timestamp

  ### 1.11 lesson_progress
  - `id` (uuid, primary key) - Unique progress record
  - `student_id` (uuid, foreign key) - Student user
  - `lesson_id` (uuid, foreign key) - Lesson
  - `time_spent_minutes` (integer) - Time spent on lesson
  - `is_completed` (boolean) - Completion status
  - `completed_at` (timestamptz) - Completion timestamp
  - `last_accessed` (timestamptz) - Last access timestamp

  ### 1.12 assessment_submissions
  - `id` (uuid, primary key) - Unique submission identifier
  - `student_id` (uuid, foreign key) - Student user
  - `assessment_id` (uuid, foreign key) - Assessment
  - `score` (decimal) - Score achieved
  - `total_marks` (integer) - Maximum possible score
  - `status` (text) - Submission status: 'in_progress', 'submitted', 'evaluated'
  - `started_at` (timestamptz) - Start timestamp
  - `submitted_at` (timestamptz) - Submission timestamp
  - `evaluated_at` (timestamptz) - Evaluation timestamp

  ### 1.13 mcq_responses
  - `id` (uuid, primary key) - Unique response identifier
  - `submission_id` (uuid, foreign key) - Parent submission
  - `question_id` (uuid, foreign key) - MCQ question
  - `selected_option` (text) - Student's answer
  - `is_correct` (boolean) - Correctness of answer
  - `marks_awarded` (decimal) - Marks received
  - `answered_at` (timestamptz) - Response timestamp

  ### 1.14 coding_submissions
  - `id` (uuid, primary key) - Unique submission identifier
  - `submission_id` (uuid, foreign key) - Parent assessment submission
  - `question_id` (uuid, foreign key) - Coding question
  - `code` (text) - Submitted code
  - `language` (text) - Programming language
  - `test_cases_passed` (integer) - Number of test cases passed
  - `total_test_cases` (integer) - Total test cases
  - `execution_time_ms` (integer) - Code execution time
  - `memory_used_mb` (decimal) - Memory consumption
  - `marks_awarded` (decimal) - Marks received
  - `submitted_at` (timestamptz) - Submission timestamp

  ### 1.15 assignment_submissions
  - `id` (uuid, primary key) - Unique submission identifier
  - `submission_id` (uuid, foreign key) - Parent assessment submission
  - `assignment_id` (uuid, foreign key) - Assignment
  - `file_url` (text) - Submitted file URL
  - `file_name` (text) - Original file name
  - `file_size_mb` (decimal) - File size
  - `submitted_at` (timestamptz) - Submission timestamp

  ### 1.16 notifications
  - `id` (uuid, primary key) - Unique notification identifier
  - `user_id` (uuid, foreign key) - Recipient user
  - `title` (text) - Notification title
  - `message` (text) - Notification content
  - `type` (text) - Type: 'deadline', 'course_assigned', 'result', 'announcement'
  - `is_read` (boolean) - Read status
  - `created_at` (timestamptz) - Creation timestamp

  ### 1.17 certificates
  - `id` (uuid, primary key) - Unique certificate identifier
  - `student_id` (uuid, foreign key) - Student user
  - `course_id` (uuid, foreign key) - Completed course
  - `certificate_url` (text) - Generated certificate URL
  - `issued_at` (timestamptz) - Issue timestamp

  ### 1.18 gamification
  - `id` (uuid, primary key) - Unique record identifier
  - `student_id` (uuid, foreign key) - Student user
  - `course_id` (uuid, foreign key) - Course
  - `points` (integer) - Total points earned
  - `badges` (text[]) - Array of earned badges
  - `rank` (integer) - Student rank in course
  - `updated_at` (timestamptz) - Last update timestamp

  ### 1.19 audit_logs
  - `id` (uuid, primary key) - Unique log identifier
  - `user_id` (uuid, foreign key) - User who performed action
  - `action` (text) - Action performed
  - `resource_type` (text) - Type of resource affected
  - `resource_id` (uuid) - ID of affected resource
  - `details` (jsonb) - Additional action details
  - `created_at` (timestamptz) - Action timestamp

  ### 1.20 system_settings
  - `id` (uuid, primary key) - Unique setting identifier
  - `key` (text, unique) - Setting key
  - `value` (jsonb) - Setting value
  - `updated_at` (timestamptz) - Last update timestamp

  ## 2. Security

  All tables have Row Level Security (RLS) enabled with appropriate policies:
  
  - **Super Admin**: Full access to all resources
  - **Admin**: Can manage courses, assessments, and view student progress
  - **Students**: Can only access their assigned courses and their own submissions/progress

  ## 3. Indexes

  Indexes are created on foreign keys and frequently queried columns for optimal performance.

  ## 4. Important Notes

  - All timestamps use `timestamptz` for timezone awareness
  - UUIDs are used for all primary keys for security and scalability
  - Boolean fields have sensible defaults
  - File URLs point to cloud storage (AWS S3/Azure Blob)
  - All destructive operations are avoided to preserve data integrity
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'student')),
  full_name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  category text CHECK (category IN ('labs', 'semester_exams', 'aptitude', 'communication', 'coding', 'placement', 'general')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  is_published boolean DEFAULT false,
  enable_certificates boolean DEFAULT false,
  enable_gamification boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create modules table
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  min_time_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('text', 'video', 'pdf', 'ppt', 'coding')),
  content_url text,
  content_text text,
  order_index integer NOT NULL DEFAULT 0,
  min_time_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create assessments table
CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('mcq', 'coding', 'assignment')),
  description text DEFAULT '',
  duration_minutes integer DEFAULT 60,
  total_marks integer DEFAULT 100,
  passing_marks integer DEFAULT 40,
  randomize_questions boolean DEFAULT false,
  enable_negative_marking boolean DEFAULT false,
  negative_marks_per_question decimal DEFAULT 0,
  show_results_immediately boolean DEFAULT false,
  deadline timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create mcq_questions table
CREATE TABLE IF NOT EXISTS mcq_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_option text NOT NULL CHECK (correct_option IN ('a', 'b', 'c', 'd')),
  marks integer DEFAULT 1,
  difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard')),
  topic text,
  explanation text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create coding_questions table
CREATE TABLE IF NOT EXISTS coding_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard')),
  marks integer DEFAULT 10,
  time_limit_seconds integer DEFAULT 5,
  memory_limit_mb integer DEFAULT 256,
  starter_code text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create test_cases table
CREATE TABLE IF NOT EXISTS test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coding_question_id uuid REFERENCES coding_questions(id) ON DELETE CASCADE NOT NULL,
  input text NOT NULL,
  expected_output text NOT NULL,
  is_hidden boolean DEFAULT false,
  weightage integer DEFAULT 10,
  created_at timestamptz DEFAULT now()
);

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  max_file_size_mb integer DEFAULT 10,
  allowed_file_types text[] DEFAULT ARRAY['pdf', 'doc', 'docx', 'txt', 'zip'],
  deadline timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create student_courses table
CREATE TABLE IF NOT EXISTS student_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(student_id, course_id)
);

-- Create lesson_progress table
CREATE TABLE IF NOT EXISTS lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE NOT NULL,
  time_spent_minutes integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  last_accessed timestamptz DEFAULT now(),
  UNIQUE(student_id, lesson_id)
);

-- Create assessment_submissions table
CREATE TABLE IF NOT EXISTS assessment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
  score decimal DEFAULT 0,
  total_marks integer NOT NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'evaluated')),
  started_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  evaluated_at timestamptz
);

-- Create mcq_responses table
CREATE TABLE IF NOT EXISTS mcq_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES assessment_submissions(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES mcq_questions(id) ON DELETE CASCADE NOT NULL,
  selected_option text CHECK (selected_option IN ('a', 'b', 'c', 'd')),
  is_correct boolean DEFAULT false,
  marks_awarded decimal DEFAULT 0,
  answered_at timestamptz DEFAULT now()
);

-- Create coding_submissions table
CREATE TABLE IF NOT EXISTS coding_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES assessment_submissions(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES coding_questions(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  language text DEFAULT 'javascript',
  test_cases_passed integer DEFAULT 0,
  total_test_cases integer NOT NULL,
  execution_time_ms integer DEFAULT 0,
  memory_used_mb decimal DEFAULT 0,
  marks_awarded decimal DEFAULT 0,
  submitted_at timestamptz DEFAULT now()
);

-- Create assignment_submissions table
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES assessment_submissions(id) ON DELETE CASCADE NOT NULL,
  assignment_id uuid REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size_mb decimal NOT NULL,
  submitted_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text CHECK (type IN ('deadline', 'course_assigned', 'result', 'announcement', 'general')),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  certificate_url text,
  issued_at timestamptz DEFAULT now(),
  UNIQUE(student_id, course_id)
);

-- Create gamification table
CREATE TABLE IF NOT EXISTS gamification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  points integer DEFAULT 0,
  badges text[] DEFAULT ARRAY[]::text[],
  rank integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, course_id)
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON courses(created_by);
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_assessments_module_id ON assessments(module_id);
CREATE INDEX IF NOT EXISTS idx_mcq_questions_assessment_id ON mcq_questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_coding_questions_assessment_id ON coding_questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_coding_question_id ON test_cases(coding_question_id);
CREATE INDEX IF NOT EXISTS idx_student_courses_student_id ON student_courses(student_id);
CREATE INDEX IF NOT EXISTS idx_student_courses_course_id ON student_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student_id ON lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_student_id ON assessment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_assessment_id ON assessment_submissions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );

CREATE POLICY "Admins can view admins and students"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
    AND role IN ('admin', 'student')
  );

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Super admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for courses table
CREATE POLICY "Admins can view all courses"
  ON courses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Students can view assigned published courses"
  ON courses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'student'
    )
    AND is_published = true
    AND EXISTS (
      SELECT 1 FROM student_courses sc 
      WHERE sc.course_id = courses.id AND sc.student_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update courses"
  ON courses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete courses"
  ON courses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for modules table
CREATE POLICY "Users can view modules of accessible courses"
  ON modules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = modules.course_id
      AND (
        -- Admins can see all
        EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('admin', 'super_admin')
        )
        OR
        -- Students can see their assigned published courses
        (
          c.is_published = true
          AND EXISTS (
            SELECT 1 FROM student_courses sc 
            WHERE sc.course_id = c.id AND sc.student_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "Admins can insert modules"
  ON modules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update modules"
  ON modules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete modules"
  ON modules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for lessons, assessments, and other tables follow similar patterns
-- For brevity, creating policies for key student-facing tables

-- Lessons policies
CREATE POLICY "Users can view lessons of accessible modules"
  ON lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id
      AND (
        EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('admin', 'super_admin')
        )
        OR
        (
          c.is_published = true
          AND EXISTS (
            SELECT 1 FROM student_courses sc 
            WHERE sc.course_id = c.id AND sc.student_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "Admins can manage lessons"
  ON lessons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- Student courses policies
CREATE POLICY "Students can view own enrollments"
  ON student_courses FOR SELECT
  TO authenticated
  USING (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Admins can manage student enrollments"
  ON student_courses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- Lesson progress policies
CREATE POLICY "Students can view own progress"
  ON lesson_progress FOR SELECT
  TO authenticated
  USING (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Students can update own progress"
  ON lesson_progress FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can modify own progress"
  ON lesson_progress FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Assessment policies
CREATE POLICY "Users can view assessments of accessible modules"
  ON assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = assessments.module_id
      AND (
        EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('admin', 'super_admin')
        )
        OR
        (
          c.is_published = true
          AND EXISTS (
            SELECT 1 FROM student_courses sc 
            WHERE sc.course_id = c.id AND sc.student_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "Admins can manage assessments"
  ON assessments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- MCQ questions policies
CREATE POLICY "Users can view MCQ questions of accessible assessments"
  ON mcq_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN modules m ON m.id = a.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE a.id = mcq_questions.assessment_id
      AND (
        EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('admin', 'super_admin')
        )
        OR
        (
          c.is_published = true
          AND EXISTS (
            SELECT 1 FROM student_courses sc 
            WHERE sc.course_id = c.id AND sc.student_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "Admins can manage MCQ questions"
  ON mcq_questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- Similar policies for coding_questions, test_cases, assignments
CREATE POLICY "Users can view coding questions of accessible assessments"
  ON coding_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN modules m ON m.id = a.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE a.id = coding_questions.assessment_id
      AND (
        EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('admin', 'super_admin')
        )
        OR
        (
          c.is_published = true
          AND EXISTS (
            SELECT 1 FROM student_courses sc 
            WHERE sc.course_id = c.id AND sc.student_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "Admins can manage coding questions"
  ON coding_questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view test cases"
  ON test_cases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coding_questions cq
      JOIN assessments a ON a.id = cq.assessment_id
      JOIN modules m ON m.id = a.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE cq.id = test_cases.coding_question_id
      AND (
        EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('admin', 'super_admin')
        )
        OR
        (
          is_hidden = false
          AND c.is_published = true
          AND EXISTS (
            SELECT 1 FROM student_courses sc 
            WHERE sc.course_id = c.id AND sc.student_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "Admins can manage test cases"
  ON test_cases FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view assignments"
  ON assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN modules m ON m.id = a.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE a.id = assignments.assessment_id
      AND (
        EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('admin', 'super_admin')
        )
        OR
        (
          c.is_published = true
          AND EXISTS (
            SELECT 1 FROM student_courses sc 
            WHERE sc.course_id = c.id AND sc.student_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "Admins can manage assignments"
  ON assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- Assessment submissions policies
CREATE POLICY "Students can view own submissions"
  ON assessment_submissions FOR SELECT
  TO authenticated
  USING (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Students can create submissions"
  ON assessment_submissions FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own submissions"
  ON assessment_submissions FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can update submissions"
  ON assessment_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- MCQ responses policies
CREATE POLICY "Students can view own MCQ responses"
  ON mcq_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_submissions asub
      WHERE asub.id = mcq_responses.submission_id
      AND (
        asub.student_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('admin', 'super_admin')
        )
      )
    )
  );

CREATE POLICY "Students can insert MCQ responses"
  ON mcq_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_submissions asub
      WHERE asub.id = mcq_responses.submission_id
      AND asub.student_id = auth.uid()
    )
  );

-- Coding submissions policies
CREATE POLICY "Students can view own coding submissions"
  ON coding_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_submissions asub
      WHERE asub.id = coding_submissions.submission_id
      AND (
        asub.student_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('admin', 'super_admin')
        )
      )
    )
  );

CREATE POLICY "Students can insert coding submissions"
  ON coding_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_submissions asub
      WHERE asub.id = coding_submissions.submission_id
      AND asub.student_id = auth.uid()
    )
  );

-- Assignment submissions policies
CREATE POLICY "Students can view own assignment submissions"
  ON assignment_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_submissions asub
      WHERE asub.id = assignment_submissions.submission_id
      AND (
        asub.student_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('admin', 'super_admin')
        )
      )
    )
  );

CREATE POLICY "Students can insert assignment submissions"
  ON assignment_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_submissions asub
      WHERE asub.id = assignment_submissions.submission_id
      AND asub.student_id = auth.uid()
    )
  );

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Certificates policies
CREATE POLICY "Students can view own certificates"
  ON certificates FOR SELECT
  TO authenticated
  USING (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'super_admin')
  ));

CREATE POLICY "System can issue certificates"
  ON certificates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- Gamification policies
CREATE POLICY "Students can view own gamification"
  ON gamification FOR SELECT
  TO authenticated
  USING (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'super_admin')
  ));

CREATE POLICY "System can update gamification"
  ON gamification FOR ALL
  TO authenticated
  USING (
    student_id = auth.uid() OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- Audit logs policies
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "System can create audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- System settings policies
CREATE POLICY "Admins can view system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Super admins can manage system settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'super_admin'
    )
  );