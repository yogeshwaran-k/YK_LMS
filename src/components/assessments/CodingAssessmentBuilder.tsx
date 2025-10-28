import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Loader2, Code } from 'lucide-react';

interface CodingQuestion {
  id: string;
  assessment_id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  marks: number;
  time_limit_seconds: number;
  memory_limit_mb: number;
  starter_code: string;
}

interface TestCase {
  id: string;
  coding_question_id: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  weightage: number;
}

interface CodingAssessmentBuilderProps {
  assessment: {
    id: string;
    title: string;
  };
  onBack: () => void;
}

export default function CodingAssessmentBuilder({ assessment, onBack }: CodingAssessmentBuilderProps) {
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<CodingQuestion | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showTestCaseModal, setShowTestCaseModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<CodingQuestion | null>(null);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, [assessment.id]);

  useEffect(() => {
    if (selectedQuestion) {
      fetchTestCases(selectedQuestion.id);
    }
  }, [selectedQuestion]);

  async function fetchQuestions() {
    setLoading(true);
    const { data } = await supabase
      .from('coding_questions')
      .select('*')
      .eq('assessment_id', assessment.id)
      .order('created_at', { ascending: true });

    if (data) {
      setQuestions(data);
      if (data.length > 0 && !selectedQuestion) {
        setSelectedQuestion(data[0]);
      }
    }
    setLoading(false);
  }

  async function fetchTestCases(questionId: string) {
    const { data } = await supabase
      .from('test_cases')
      .select('*')
      .eq('coding_question_id', questionId)
      .order('created_at', { ascending: true });

    if (data) {
      setTestCases(data);
    }
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!confirm('Are you sure you want to delete this coding question?')) return;

    const { error } = await supabase
      .from('coding_questions')
      .delete()
      .eq('id', questionId);

    if (!error) {
      fetchQuestions();
      setSelectedQuestion(null);
    }
  }

  async function handleDeleteTestCase(testCaseId: string) {
    if (!confirm('Are you sure you want to delete this test case?')) return;

    const { error } = await supabase
      .from('test_cases')
      .delete()
      .eq('id', testCaseId);

    if (!error && selectedQuestion) {
      fetchTestCases(selectedQuestion.id);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2"
        >
          ← Back to Assessments
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Coding Questions - {assessment.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Questions ({questions.length})</h2>
            <button
              onClick={() => {
                setEditingQuestion(null);
                setShowQuestionModal(true);
              }}
              className="text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
          ) : (
            <div className="space-y-2">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                    selectedQuestion?.id === question.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedQuestion(question)}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {index + 1}. {question.title}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingQuestion(question);
                          setShowQuestionModal(true);
                        }}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteQuestion(question.id);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {question.difficulty && (
                      <span className={`px-2 py-0.5 rounded ${
                        question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {question.difficulty}
                      </span>
                    )}
                    <span>{question.marks} marks</span>
                  </div>
                </div>
              ))}
              {questions.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No questions yet
                </p>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          {selectedQuestion ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedQuestion.title}</h2>
                <div className="flex items-center gap-3 mb-4">
                  {selectedQuestion.difficulty && (
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      selectedQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                      selectedQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {selectedQuestion.difficulty}
                    </span>
                  )}
                  <span className="text-sm text-gray-600">
                    Time Limit: {selectedQuestion.time_limit_seconds}s
                  </span>
                  <span className="text-sm text-gray-600">
                    Memory: {selectedQuestion.memory_limit_mb}MB
                  </span>
                </div>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedQuestion.description}</p>
                </div>
                {selectedQuestion.starter_code && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Starter Code:</h3>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{selectedQuestion.starter_code}</code>
                    </pre>
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Test Cases ({testCases.length})</h3>
                  <button
                    onClick={() => {
                      setEditingTestCase(null);
                      setShowTestCaseModal(true);
                    }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Test Case
                  </button>
                </div>

                <div className="space-y-3">
                  {testCases.map((testCase, index) => (
                    <div key={testCase.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            Test Case {index + 1}
                          </span>
                          {testCase.is_hidden && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                              Hidden
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {testCase.weightage} points
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingTestCase(testCase);
                              setShowTestCaseModal(true);
                            }}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteTestCase(testCase.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 mb-1">Input:</p>
                          <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                            {testCase.input}
                          </pre>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Expected Output:</p>
                          <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                            {testCase.expected_output}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                  {testCases.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No test cases yet
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Code className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Select a question or create a new one</p>
            </div>
          )}
        </div>
      </div>

      {showQuestionModal && (
        <CodingQuestionModal
          assessmentId={assessment.id}
          question={editingQuestion}
          onClose={() => {
            setShowQuestionModal(false);
            setEditingQuestion(null);
          }}
          onSuccess={() => {
            setShowQuestionModal(false);
            setEditingQuestion(null);
            fetchQuestions();
          }}
        />
      )}

      {showTestCaseModal && selectedQuestion && (
        <TestCaseModal
          questionId={selectedQuestion.id}
          testCase={editingTestCase}
          onClose={() => {
            setShowTestCaseModal(false);
            setEditingTestCase(null);
          }}
          onSuccess={() => {
            setShowTestCaseModal(false);
            setEditingTestCase(null);
            fetchTestCases(selectedQuestion.id);
          }}
        />
      )}
    </div>
  );
}

interface CodingQuestionModalProps {
  assessmentId: string;
  question: CodingQuestion | null;
  onClose: () => void;
  onSuccess: () => void;
}

function CodingQuestionModal({ assessmentId, question, onClose, onSuccess }: CodingQuestionModalProps) {
  const [formData, setFormData] = useState({
    title: question?.title || '',
    description: question?.description || '',
    difficulty: question?.difficulty || 'medium' as 'easy' | 'medium' | 'hard',
    marks: question?.marks || 10,
    time_limit_seconds: question?.time_limit_seconds || 5,
    memory_limit_mb: question?.memory_limit_mb || 256,
    starter_code: question?.starter_code || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (question) {
        const { error } = await supabase
          .from('coding_questions')
          .update(formData)
          .eq('id', question.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('coding_questions')
          .insert([{
            ...formData,
            assessment_id: assessmentId,
          }]);

        if (error) throw error;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {question ? 'Edit Coding Question' : 'Add Coding Question'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={6}
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marks</label>
              <input
                type="number"
                min="1"
                required
                value={formData.marks}
                onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) || 10 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time (sec)</label>
              <input
                type="number"
                min="1"
                required
                value={formData.time_limit_seconds}
                onChange={(e) => setFormData({ ...formData, time_limit_seconds: parseInt(e.target.value) || 5 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Memory (MB)</label>
              <input
                type="number"
                min="1"
                required
                value={formData.memory_limit_mb}
                onChange={(e) => setFormData({ ...formData, memory_limit_mb: parseInt(e.target.value) || 256 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Starter Code (optional)</label>
            <textarea
              rows={6}
              value={formData.starter_code}
              onChange={(e) => setFormData({ ...formData, starter_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="function solution() {&#10;  // Write your code here&#10;}"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : question ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface TestCaseModalProps {
  questionId: string;
  testCase: TestCase | null;
  onClose: () => void;
  onSuccess: () => void;
}

function TestCaseModal({ questionId, testCase, onClose, onSuccess }: TestCaseModalProps) {
  const [formData, setFormData] = useState({
    input: testCase?.input || '',
    expected_output: testCase?.expected_output || '',
    is_hidden: testCase?.is_hidden ?? false,
    weightage: testCase?.weightage || 10,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (testCase) {
        const { error } = await supabase
          .from('test_cases')
          .update(formData)
          .eq('id', testCase.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('test_cases')
          .insert([{
            ...formData,
            coding_question_id: questionId,
          }]);

        if (error) throw error;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {testCase ? 'Edit Test Case' : 'Add Test Case'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Input</label>
            <textarea
              rows={4}
              required
              value={formData.input}
              onChange={(e) => setFormData({ ...formData, input: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Output</label>
            <textarea
              rows={4}
              required
              value={formData.expected_output}
              onChange={(e) => setFormData({ ...formData, expected_output: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weightage (points)</label>
              <input
                type="number"
                min="1"
                required
                value={formData.weightage}
                onChange={(e) => setFormData({ ...formData, weightage: parseInt(e.target.value) || 10 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-end">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_hidden"
                  checked={formData.is_hidden}
                  onChange={(e) => setFormData({ ...formData, is_hidden: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_hidden" className="ml-2 block text-sm text-gray-700">
                  Hidden test case
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : testCase ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
