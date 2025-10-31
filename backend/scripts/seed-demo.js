// Seed a demo course with practice and test assessments (MCQ + Coding)
// Usage: node scripts/seed-demo.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: __dirname + '/../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE envs');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function upsert(table, row, uniqKeys) {
  const match = {};
  for (const k of uniqKeys) match[k] = row[k];
  const { data: found } = await db.from(table).select('*').match(match).maybeSingle();
  if (found) return found;
  const { data, error } = await db.from(table).insert([row]).select().maybeSingle();
  if (error) throw error;
  return data;
}

(async () => {
  try {
    const course = await upsert('courses', { title: 'Demo Course', description: 'Sample course for LMS demo', category: 'general', is_published: true }, ['title']);

    const practiceModule = await upsert('modules', { title: 'Practice Module', course_id: course.id, order_index: 0 }, ['title','course_id']);
    const testModule = await upsert('modules', { title: 'Test Module', course_id: course.id, order_index: 1 }, ['title','course_id']);

    // Practice MCQ
    const practiceMcq = await upsert('assessments', { title: 'Practice MCQ', type: 'mcq', module_id: practiceModule.id, is_practice: true, total_marks: 10, passing_marks: 5, show_results_immediately: true }, ['title','module_id']);
    // Practice Coding
    const practiceCode = await upsert('assessments', { title: 'Practice Coding', type: 'coding', module_id: practiceModule.id, is_practice: true, total_marks: 20, passing_marks: 10, allowed_languages: ['javascript','python'] }, ['title','module_id']);
    // Test MCQ
    const testMcq = await upsert('assessments', { title: 'Test MCQ', type: 'mcq', module_id: testModule.id, is_practice: false, total_marks: 10, passing_marks: 5 }, ['title','module_id']);
    // Test Coding
    const testCode = await upsert('assessments', { title: 'Test Coding', type: 'coding', module_id: testModule.id, is_practice: false, total_marks: 20, passing_marks: 10, allowed_languages: ['javascript','python'] }, ['title','module_id']);

    // MCQ questions (3 each)
    async function seedMcq(assessment_id) {
      const questions = [
        { question_text: 'What is 2 + 2?', option_a: '3', option_b: '4', option_c: '5', option_d: '22', correct_option: 'b', marks: 1 },
        { question_text: 'Capital of France?', option_a: 'Berlin', option_b: 'Madrid', option_c: 'Paris', option_d: 'Rome', correct_option: 'c', marks: 1 },
        { question_text: 'JS type of []?', option_a: 'object', option_b: 'array', option_c: 'list', option_d: 'tuple', correct_option: 'a', marks: 1 },
      ];
      for (const q of questions) {
        await db.from('mcq_questions').insert([{ ...q, assessment_id }]);
      }
    }
    await seedMcq(practiceMcq.id);
    await seedMcq(testMcq.id);

    // Coding question + test cases
    async function seedCoding(assessment_id) {
      const { data: cq, error } = await db
        .from('coding_questions')
        .insert([{ assessment_id, title: 'Sum Two Numbers', description: 'Read two integers and print their sum.', difficulty: 'easy', marks: 20, starter_code: '' }])
        .select()
        .maybeSingle();
      if (!cq) return;
      await db.from('test_cases').insert([
        { coding_question_id: cq.id, input: '2 3', expected_output: '5\n', is_hidden: false, weightage: 10 },
        { coding_question_id: cq.id, input: '10 20', expected_output: '30\n', is_hidden: true, weightage: 10 },
      ]);
    }
    await seedCoding(practiceCode.id);
    await seedCoding(testCode.id);

    console.log('Seeded demo course with practice/test assessments.');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
