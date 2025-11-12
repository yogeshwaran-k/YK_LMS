import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Code,
  Clock,
  HardDrive,
  Trophy,
  Eye,
  EyeOff,
  Play,
  AlertCircle,
  X,
  Terminal,
} from 'lucide-react';
import AceCodeEditor from '../common/AceCodeEditor';

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
  const [referenceSolution, setReferenceSolution] = useState<string>('');
  const [referenceLanguage, setReferenceLanguage] = useState<'javascript' | 'python' | 'cpp' | 'c' | 'java' | 'typescript'>('javascript');
  const [showHiddenCases, setShowHiddenCases] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [assessment.id]);

  useEffect(() => {
    if (selectedQuestion) {
      fetchTestCases(selectedQuestion.id);
      setReferenceSolution(selectedQuestion.starter_code || '');
    }
  }, [selectedQuestion]);

  async function fetchQuestions() {
    setLoading(true);
    try {
      const data = await api.get<CodingQuestion[]>(`/assessments/${assessment.id}/coding-questions`);
      setQuestions(data);
      if (data.length > 0 && !selectedQuestion) {
        setSelectedQuestion(data[0]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchTestCases(questionId: string) {
    const data = await api.get<TestCase[]>(`/assessments/coding-questions/${questionId}/test-cases`);
    setTestCases(data);
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!window.confirm('Delete this coding question permanently?')) return;
    try {
      await api.delete(`/assessments/coding-questions/${questionId}`);
      setSelectedQuestion(null);
      fetchQuestions();
    } catch {
      alert('Failed to delete question.');
    }
  }

  async function handleDeleteTestCase(testCaseId: string) {
    if (!window.confirm('Delete this test case?')) return;
    try {
      await api.delete(`/assessments/test-cases/${testCaseId}`);
      if (selectedQuestion) fetchTestCases(selectedQuestion.id);
    } catch {
      alert('Failed to delete test case.');
    }
  }

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const totalTestCases = testCases.length;
  const hiddenCount = testCases.filter(t => t.is_hidden).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm font-medium mb-2"
          >
            Back to Assessments
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Coding Assessment Builder</h1>
              <p className="mt-1 text-sm text-gray-600">{assessment.title}</p>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Code className="w-4 h-4" />
                {questions.length} Questions
              </span>
              <span className="text-gray-400">|</span>
              <span className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-yellow-600" />
                {totalMarks} Total Marks
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Questions List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Questions</h2>
              <button
                onClick={() => {
                  setEditingQuestion(null);
                  setShowQuestionModal(true);
                }}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm"
                title="Add Question"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Code className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No coding questions yet</p>
                <button
                  onClick={() => setShowQuestionModal(true)}
                  className="mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  + Add First Question
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {questions.map((q, i) => {
                  const isSelected = selectedQuestion?.id === q.id;
                  return (
                    <div
                      key={q.id}
                      onClick={() => setSelectedQuestion(q)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {i + 1}. {q.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                            {q.difficulty && (
                              <span
                                className={`px-2 py-0.5 rounded-full font-medium ${
                                  q.difficulty === 'easy'
                                    ? 'bg-green-100 text-green-700'
                                    : q.difficulty === 'medium'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {q.difficulty}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Trophy className="w-3 h-3" />
                              {q.marks} marks
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingQuestion(q);
                              setShowQuestionModal(true);
                            }}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteQuestion(q.id);
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Question Detail & Test Cases */}
          <div className="lg:col-span-2 space-y-6">
            {selectedQuestion ? (
              <>
                {/* Question Details */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">{selectedQuestion.title}</h2>
                    <div className="flex items-center gap-2 text-sm">
                      {selectedQuestion.difficulty && (
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            selectedQuestion.difficulty === 'easy'
                              ? 'bg-green-100 text-green-700'
                              : selectedQuestion.difficulty === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {selectedQuestion.difficulty}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-5 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{selectedQuestion.time_limit_seconds}s</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      <span>{selectedQuestion.memory_limit_mb}MB</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-600" />
                      <span>{selectedQuestion.marks} marks</span>
                    </div>
                  </div>

                  <div className="prose prose-sm max-w-none mb-6">
                    <div
                      dangerouslySetInnerHTML={{ __html: selectedQuestion.description.replace(/\n/g, '<br>') }}
                    />
                  </div>

                  {selectedQuestion.starter_code && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Code className="w-4 h-4" />
                        Starter Code
                      </h3>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                        {selectedQuestion.starter_code}
                      </pre>
                    </div>
                  )}

                  {/* Reference Solution */}
                  <div className="border-t pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <Terminal className="w-4 h-4" />
                        Reference Solution (Admin Only)
                      </h3>
                      <div className="flex items-center gap-2">
                        <select
                          value={referenceLanguage}
                          onChange={(e) => setReferenceLanguage(e.target.value as any)}
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          {(['javascript', 'python', 'cpp', 'c', 'java', 'typescript'] as const).map((l) => (
                            <option key={l} value={l}>
                              {l}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => setReferenceSolution(selectedQuestion.starter_code || '')}
                          className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                        >
                          Use Starter
                        </button>
                      </div>
                    </div>
                    <AceCodeEditor
                      value={referenceSolution}
                      onChange={setReferenceSolution}
                      language={referenceLanguage}
                      height="260px"
                    />
                  </div>
                </div>

                {/* Test Cases */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Test Cases ({totalTestCases})
                      </h3>
                      {hiddenCount > 0 && (
                        <button
                          onClick={() => setShowHiddenCases(!showHiddenCases)}
                          className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200"
                        >
                          {showHiddenCases ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {hiddenCount} hidden
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setEditingTestCase(null);
                        setShowTestCaseModal(true);
                      }}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Test Case
                    </button>
                  </div>

                  {testCases.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Terminal className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No test cases yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {testCases
                        .filter((tc) => showHiddenCases || !tc.is_hidden)
                        .map((tc, i) => (
                          <div
                            key={tc.id}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-gray-900">
                                  Test Case {i + 1}
                                </span>
                                {tc.is_hidden && (
                                  <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                    Hidden
                                  </span>
                                )}
                                <span className="text-xs text-gray-500">
                                  {tc.weightage} points
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => {
                                    setEditingTestCase(tc);
                                    setShowTestCaseModal(true);
                                  }}
                                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTestCase(tc.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div>
                                <p className="text-gray-600 font-medium mb-1">Input:</p>
                                <pre className="bg-gray-50 p-3 rounded overflow-x-auto font-mono text-xs">
                                  {tc.input}
                                </pre>
                              </div>
                              <div>
                                <p className="text-gray-600 font-medium mb-1">Expected Output:</p>
                                <pre className="bg-gray-50 p-3 rounded overflow-x-auto font-mono text-xs">
                                  {tc.expected_output}
                                </pre>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Code className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Select a question</h3>
                <p className="text-sm text-gray-500">Choose a coding question from the left to view details and test cases.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
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
            referenceSolution={referenceSolution}
            referenceLanguage={referenceLanguage}
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
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// MODALS
// ────────────────────────────────────────────────────────────────

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
    difficulty: question?.difficulty || 'medium',
    marks: question?.marks || 10,
    time_limit_seconds: question?.time_limit_seconds || 5,
    memory_limit_mb: question?.memory_limit_mb || 256,
    starter_code: question?.starter_code || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (question) {
        await api.put(`/assessments/coding-questions/${question.id}`, formData);
      } else {
        await api.post(`/assessments/${assessmentId}/coding-questions`, formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full my-8 p-6 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {question ? 'Edit Coding Question' : 'Add New Coding Question'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Reverse a String"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              rows={6}
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              placeholder="Explain the problem, input/output format, constraints..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Marks *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.marks}
                onChange={(e) => setFormData({ ...formData, marks: +e.target.value || 10 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Time Limit (s) *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.time_limit_seconds}
                onChange={(e) => setFormData({ ...formData, time_limit_seconds: +e.target.value || 5 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Memory Limit (MB) *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.memory_limit_mb}
                onChange={(e) => setFormData({ ...formData, memory_limit_mb: +e.target.value || 256 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Starter Code (optional)</label>
            <textarea
              rows={8}
              value={formData.starter_code}
              onChange={(e) => setFormData({ ...formData, starter_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              placeholder="// Write your solution here"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : question ? (
                'Update Question'
              ) : (
                'Create Question'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────

interface TestCaseModalProps {
  questionId: string;
  testCase: TestCase | null;
  referenceSolution?: string;
  referenceLanguage?: string;
  onClose: () => void;
  onSuccess: () => void;
}

function TestCaseModal({
  questionId,
  testCase,
  referenceSolution = '',
  referenceLanguage = 'javascript',
  onClose,
  onSuccess,
}: TestCaseModalProps) {
  const [formData, setFormData] = useState({
    input: testCase?.input || '',
    expected_output: testCase?.expected_output || '',
    is_hidden: testCase?.is_hidden ?? false,
    weightage: testCase?.weightage || 10,
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleAutoGenerate = async () => {
    if (!referenceSolution.trim()) {
      alert('Reference solution is empty.');
      return;
    }
    setGenerating(true);
    try {
      const res = await api.post<{ stdout: string }>('/runner/execute', {
        language: referenceLanguage,
        code: referenceSolution,
        stdin: formData.input,
      });
      setFormData((prev) => ({ ...prev, expected_output: res.stdout || '' }));
    } catch (err: any) {
      alert(err.message || 'Failed to generate output');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (testCase) {
        await api.put(`/assessments/test-cases/${testCase.id}`, formData);
      } else {
        await api.post(`/assessments/coding-questions/${questionId}/test-cases`, formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save test case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900">
            {testCase ? 'Edit Test Case' : 'Add Test Case'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Input *</label>
            <textarea
              rows={4}
              required
              value={formData.input}
              onChange={(e) => setFormData({ ...formData, input: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              placeholder="1 2 3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Expected Output *</label>
            <textarea
              rows={4}
              required
              value={formData.expected_output}
              onChange={(e) => setFormData({ ...formData, expected_output: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              placeholder="6"
            />
            <button
              type="button"
              onClick={handleAutoGenerate}
              disabled={generating || !referenceSolution}
              className="mt-2 flex items-center gap-2 text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              Auto-generate from Reference Solution
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Weightage (points) *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.weightage}
                onChange={(e) => setFormData({ ...formData, weightage: +e.target.value || 10 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_hidden}
                  onChange={(e) => setFormData({ ...formData, is_hidden: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-700">Hidden Test Case</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : testCase ? (
                'Update'
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}