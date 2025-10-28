import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react';

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

export default function MCQAssessmentBuilder({ assessment, onBack }: MCQAssessmentBuilderProps) {
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<MCQQuestion | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, [assessment.id]);

  async function fetchQuestions() {
    setLoading(true);
    const { data } = await supabase
      .from('mcq_questions')
      .select('*')
      .eq('assessment_id', assessment.id)
      .order('created_at', { ascending: true });

    if (data) {
      setQuestions(data);
    }
    setLoading(false);
  }

  function openCreateModal() {
    setEditingQuestion(null);
    setShowModal(true);
  }

  function openEditModal(question: MCQQuestion) {
    setEditingQuestion(question);
    setShowModal(true);
  }

  async function handleDelete(questionId: string) {
    if (!confirm('Are you sure you want to delete this question?')) return;

    const { error } = await supabase
      .from('mcq_questions')
      .delete()
      .eq('id', questionId);

    if (!error) {
      fetchQuestions();
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
        <h1 className="text-2xl font-bold text-gray-900">MCQ Questions - {assessment.title}</h1>
        <p className="text-sm text-gray-500 mt-1">Total Questions: {questions.length}</p>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          Add Question
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-blue-100 text-blue-600 font-bold px-3 py-1 rounded">
                      Q{index + 1}
                    </span>
                    {question.difficulty && (
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {question.difficulty}
                      </span>
                    )}
                    {question.topic && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {question.topic}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                    </span>
                  </div>
                  <p className="text-gray-900 font-medium mb-3">{question.question_text}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(['a', 'b', 'c', 'd'] as const).map((opt) => (
                      <div
                        key={opt}
                        className={`flex items-start gap-2 p-3 rounded-lg border-2 ${
                          question.correct_option === opt
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-semibold text-gray-700">{opt.toUpperCase()}.</span>
                          <span className="text-gray-900">
                            {question[`option_${opt}` as keyof MCQQuestion]}
                          </span>
                        </div>
                        {question.correct_option === opt && (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>

                  {question.explanation && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-900">
                        <span className="font-semibold">Explanation: </span>
                        {question.explanation}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => openEditModal(question)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(question.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {questions.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No questions yet. Click "Add Question" to create one.
            </div>
          )}
        </div>
      )}

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
    correct_option: question?.correct_option || 'a' as 'a' | 'b' | 'c' | 'd',
    marks: question?.marks || 1,
    difficulty: question?.difficulty || 'medium' as 'easy' | 'medium' | 'hard',
    topic: question?.topic || '',
    explanation: question?.explanation || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const questionData = {
        ...formData,
        topic: formData.topic || null,
      };

      if (question) {
        const { error } = await supabase
          .from('mcq_questions')
          .update(questionData)
          .eq('id', question.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('mcq_questions')
          .insert([{
            ...questionData,
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
          {question ? 'Edit Question' : 'Add New Question'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Text
            </label>
            <textarea
              rows={3}
              required
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Option A
              </label>
              <input
                type="text"
                required
                value={formData.option_a}
                onChange={(e) => setFormData({ ...formData, option_a: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Option B
              </label>
              <input
                type="text"
                required
                value={formData.option_b}
                onChange={(e) => setFormData({ ...formData, option_b: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Option C
              </label>
              <input
                type="text"
                required
                value={formData.option_c}
                onChange={(e) => setFormData({ ...formData, option_c: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Option D
              </label>
              <input
                type="text"
                required
                value={formData.option_d}
                onChange={(e) => setFormData({ ...formData, option_d: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correct Answer
              </label>
              <select
                value={formData.correct_option}
                onChange={(e) => setFormData({ ...formData, correct_option: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="a">A</option>
                <option value="b">B</option>
                <option value="c">C</option>
                <option value="d">D</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marks
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.marks}
                onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic
              </label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Explanation (optional)
            </label>
            <textarea
              rows={2}
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Explain why this is the correct answer..."
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
