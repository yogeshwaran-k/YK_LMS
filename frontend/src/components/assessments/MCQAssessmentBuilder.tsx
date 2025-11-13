import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  Search,
  X,
  Eye,
  EyeOff,
  ChevronDown,
} from 'lucide-react';
import BulkUpload from './MCQBulkUpload';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface MCQQuestion {
  id: string;
  assessment_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'a' | 'b' | 'c' | 'd';
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  topic: string | null;
  explanation: string;
}

interface MCQAssessmentBuilderProps {
  assessment: {
    id: string;
    title: string;
  };
  onBack: () => void;
}

function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter text...',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['clean'],
    ],
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder}
        className="bg-white"
      />
    </div>
  );
}

export default function MCQAssessmentBuilder({ assessment, onBack }: MCQAssessmentBuilderProps) {
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<MCQQuestion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [showAnswers, setShowAnswers] = useState(false);
  
  // New State for Selection
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Question Bank
  const [banks, setBanks] = useState<{ id: string; name: string }[]>([]);
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [importMode, setImportMode] = useState<'random' | 'manual'>('random');
  const [importCount, setImportCount] = useState<number>(10);

  useEffect(() => {
    fetchQuestions();
    fetchBanks();
  }, [assessment.id]);

  async function fetchBanks() {
    try {
      const data = await api.get<{ id: string; name: string }[]>('/mcq-banks');
      setBanks(data);
    } catch (err) {
      console.error('Failed to fetch banks');
    }
  }

  async function fetchQuestions() {
    setLoading(true);
    try {
      const data = await api.get<MCQQuestion[]>(`/assessments/${assessment.id}/mcq-questions`);
      setQuestions(data);
      setSelectedQuestions([]); // Clear selection on refresh
    } finally {
      setLoading(false);
    }
  }

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.topic?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  function openCreateModal() {
    setEditingQuestion(null);
    setShowModal(true);
  }

  function openEditModal(question: MCQQuestion) {
    setEditingQuestion(question);
    setShowModal(true);
  }

  async function handleDelete(questionId: string) {
    if (!window.confirm('Delete this question permanently?')) return;
    try {
      await api.delete(`/assessments/mcq-questions/${questionId}`);
      fetchQuestions();
    } catch (err) {
      alert('Failed to delete question.');
    }
  }

  async function handleImport() {
    if (!selectedBank) return;
    try {
      await api.post(`/assessments/${assessment.id}/from-bank`, {
        bank_id: selectedBank,
        mode: importMode,
        count: importCount,
      });
      fetchQuestions();
    } catch (err: any) {
      alert(err.message || 'Import failed');
    }
  }

  // Bulk Selection Handlers
  const handleSelectQuestion = (id: string, isChecked: boolean) => {
    setSelectedQuestions((prev) =>
      isChecked ? [...prev, id] : prev.filter((qId) => qId !== id)
    );
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedQuestions(filteredQuestions.map((q) => q.id));
    } else {
      setSelectedQuestions([]);
    }
  };

  const isAllSelected = selectedQuestions.length > 0 && selectedQuestions.length === filteredQuestions.length;
  const isAnySelected = selectedQuestions.length > 0;

  // Bulk Actions
  async function handleBulkDelete() {
    if (!isAnySelected) return;
    if (!window.confirm(`Delete ${selectedQuestions.length} selected questions permanently?`)) return;

    try {
      setLoading(true);
      // NOTE: This assumes your API supports a bulk delete endpoint.
      // If not, you'd need to loop through and delete them one by one.
      await api.post(`/assessments/mcq-questions/bulk-delete`, { ids: selectedQuestions });
      fetchQuestions();
      setShowBulkActions(false);
    } catch (err) {
      alert('Failed to bulk delete questions.');
      setLoading(false);
    }
  }

  async function handleBulkClone() {
    if (!isAnySelected) return;
    if (!window.confirm(`Clone ${selectedQuestions.length} selected questions? (New copies will be added)`)) return;

    try {
      setLoading(true);
      // NOTE: This assumes your API supports a bulk clone endpoint.
      await api.post(`/assessments/${assessment.id}/mcq-questions/bulk-clone`, { ids: selectedQuestions });
      fetchQuestions();
      setShowBulkActions(false);
    } catch (err) {
      alert('Failed to bulk clone questions.');
      setLoading(false);
    }
  }


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
              <h1 className="text-3xl font-bold text-gray-900">MCQ Builder</h1>
              <p className="mt-1 text-sm text-gray-600">{assessment.title}</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                **{questions.length}** Questions
              </span>
              <span className="text-gray-400">|</span>
              <span>
                **{questions.reduce((sum, q) => sum + q.marks, 0)}** Total Marks
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Add & Bulk */}
            <div className="flex items-center gap-2">
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Add Question
              </button>
              <BulkUpload assessmentId={assessment.id} onDone={fetchQuestions} />
            </div>

            {/* Bulk Actions Dropdown */}
            {isAnySelected && (
                <div className="relative">
                    <button
                        onClick={() => setShowBulkActions(!showBulkActions)}
                        className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition shadow-sm border border-gray-300"
                    >
                        Bulk Actions ({selectedQuestions.length}) <ChevronDown className="w-4 h-4" />
                    </button>
                    {showBulkActions && (
                        <div className="absolute top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <button
                                onClick={() => { handleBulkClone(); setShowBulkActions(false); }}
                                className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-t-lg"
                            >
                                <Copy className="w-4 h-4" /> Clone Selected
                            </button>
                            <button
                                onClick={() => { handleBulkDelete(); setShowBulkActions(false); }}
                                className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                            >
                                <Trash2 className="w-4 h-4" /> Delete Selected
                            </button>
                        </div>
                    )}
                </div>
            )}


            <div className="flex-1" />

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
              />
            </div>

            {/* Filter */}
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            {/* Show Answers */}
            <button
              onClick={() => setShowAnswers(!showAnswers)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                showAnswers
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300'
              }`}
            >
              {showAnswers ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              Answers
            </button>
          </div>

          {/* Question Bank Import */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center gap-2 text-sm">
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select Bank</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <button
              onClick={async () => {
                const name = prompt('New Bank Name?');
                if (!name) return;
                try {
                  await api.post('/mcq-banks', { name });
                  fetchBanks();
                } catch {
                  alert('Failed to create bank');
                }
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              + New Bank
            </button>

            <select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value as any)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="random">Random</option>
              <option value="manual" disabled>
                Manual (Soon)
              </option>
            </select>

            <input
              type="number"
              min={1}
              value={importCount}
              onChange={(e) => setImportCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />

            <button
              disabled={!selectedBank}
              onClick={handleImport}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-1"
            >
              <Copy className="w-4 h-4" />
              Import
            </button>
          </div>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {searchTerm || filterDifficulty !== 'all' ? 'No questions found' : 'No questions yet'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchTerm || filterDifficulty !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Start by adding your first question.'}
            </p>
            {!searchTerm && filterDifficulty === 'all' && (
              <button
                onClick={openCreateModal}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                + Add First Question
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Select All Checkbox */}
            <div className="flex items-center gap-2 p-3 bg-gray-100 border border-gray-200 rounded-lg">
                <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                    disabled={filteredQuestions.length === 0}
                />
                <label className="text-sm font-medium text-gray-700">
                    Select All ({selectedQuestions.length}/{filteredQuestions.length})
                </label>
            </div>
            {/* Question Map */}
            {filteredQuestions.map((question, index) => {
              const difficultyColor =
                question.difficulty === 'easy'
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : question.difficulty === 'medium'
                  ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                  : 'bg-red-100 text-red-700 border-red-200';

              return (
                <div
                  key={question.id}
                  className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow ${
                    selectedQuestions.includes(question.id) ? 'border-2 border-indigo-400' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    
                    {/* Selection Checkbox */}
                    <div className="pt-1 pr-3 flex-shrink-0">
                        <input
                            type="checkbox"
                            checked={selectedQuestions.includes(question.id)}
                            onChange={(e) => handleSelectQuestion(question.id, e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded"
                        />
                    </div>
                    
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className="bg-indigo-100 text-indigo-700 font-bold text-sm px-3 py-1 rounded-full">
                          Q{index + 1}
                        </span>
                        {question.difficulty && (
                          <span
                            className={`text-xs font-medium px-2.5 py-1 rounded-full border ${difficultyColor}`}
                          >
                            {question.difficulty}
                          </span>
                        )}
                        {question.topic && (
                          <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
                            {question.topic}
                          </span>
                        )}
                        <span className="text-xs font-medium text-gray-500 ml-auto">
                          **{question.marks}** {question.marks === 1 ? 'mark' : 'marks'}
                        </span>
                      </div>

                      {/* Question */}
                      <div
                        className="prose prose-sm max-w-none mb-4"
                        dangerouslySetInnerHTML={{ __html: question.question_text }}
                      />

                      {/* Options */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(['a', 'b', 'c', 'd'] as const).map((opt) => {
                          const isCorrect = question.correct_option === opt;
                          const optionText = question[`option_${opt}` as keyof MCQQuestion] as string;

                          return (
                            <div
                              key={opt}
                              className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
                                isCorrect && showAnswers
                                  ? 'border-green-500 bg-green-50'
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            >
                              <span className="font-bold text-gray-700 mt-0.5">{opt.toUpperCase()}.</span>
                              <div
                                className="flex-1 prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: optionText }}
                              />
                              {isCorrect && showAnswers && (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      {question.explanation && showAnswers && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm font-medium text-blue-900 mb-1">Explanation:</p>
                          <div
                            className="text-sm text-blue-800 prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: question.explanation }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => openEditModal(question)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(question.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
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

      {/* Modal */}
      {showModal && (
        <MCQQuestionModal
          assessmentId={assessment.id}
          question={editingQuestion}
          onClose={() => {
            setShowModal(false);
            setEditingQuestion(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingQuestion(null);
            fetchQuestions();
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// MODAL: Clean, Rich, Professional
// ────────────────────────────────────────────────────────────────

interface MCQQuestionModalProps {
  assessmentId: string;
  question: MCQQuestion | null;
  onClose: () => void;
  onSuccess: () => void;
}

function MCQQuestionModal({ assessmentId, question, onClose, onSuccess }: MCQQuestionModalProps) {
  const [formData, setFormData] = useState({
    question_text: question?.question_text || '',
    option_a: question?.option_a || '',
    option_b: question?.option_b || '',
    option_c: question?.option_c || '',
    option_d: question?.option_d || '',
    correct_option: question?.correct_option || 'a',
    marks: question?.marks || 1,
    difficulty: question?.difficulty || 'medium',
    topic: question?.topic || '',
    explanation: question?.explanation || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: any = { ...formData };
      // Delete empty optional fields to prevent sending empty strings/nulls to API if not needed
      if (!payload.topic) delete payload.topic;
      if (!payload.difficulty) delete payload.difficulty;
      if (!payload.explanation) delete payload.explanation;

      if (question) {
        await api.put(`/assessments/mcq-questions/${question.id}`, payload);
      } else {
        await api.post(`/assessments/${assessmentId}/mcq-questions`, payload);
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
            {question ? 'Edit Question' : 'Add New Question'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
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
          {/* Question */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Question *</label>
            <RichTextEditor
              value={formData.question_text}
              onChange={(v) => setFormData({ ...formData, question_text: v })}
              placeholder="Enter your question... (supports bold, italic, lists, images, links)"
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Options *</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['a', 'b', 'c', 'd'] as const).map((opt) => (
                <div key={opt} className="relative">
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="correct"
                      checked={formData.correct_option === opt}
                      onChange={() => setFormData({ ...formData, correct_option: opt })}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <label className="text-sm font-medium text-gray-700 capitalize">
                      Option {opt.toUpperCase()}
                    </label>
                  </div>
                  <RichTextEditor
                    value={(formData as any)[`option_${opt}`]}
                    onChange={(v) => setFormData({ ...formData, [`option_${opt}`]: v } as any)}
                    placeholder={`Enter option ${opt.toUpperCase()}...`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Marks *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.marks}
                onChange={(e) => setFormData({ ...formData, marks: +e.target.value || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Difficulty</label>
              <select
                value={formData.difficulty || ''}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Topic</label>
              <input
                type="text"
                value={formData.topic || ''}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., React Hooks"
              />
            </div>
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Explanation (shown after submission)
            </label>
            <RichTextEditor
              value={formData.explanation}
              onChange={(v) => setFormData({ ...formData, explanation: v })}
              placeholder="Explain why the answer is correct..."
            />
          </div>

          {/* Actions */}
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