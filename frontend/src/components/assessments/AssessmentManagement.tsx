import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Plus, Edit2, Trash2, ChevronRight, Loader2, FileText, Code, Upload } from 'lucide-react';
import MCQAssessmentBuilder from './MCQAssessmentBuilder';
import CodingAssessmentBuilder from './CodingAssessmentBuilder';
import AssignmentBuilder from './AssignmentBuilder';

interface Assessment {
  id: string;
  module_id: string;
  title: string;
  type: 'mcq' | 'coding' | 'assignment';
  description: string;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  deadline: string | null;
  created_at: string;
}

interface Module {
  id: string;
  title: string;
  course_id: string;
}

interface Course {
  id: string;
  title: string;
}

export default function AssessmentManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchModules(selectedCourse.id);
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedModule) {
      fetchAssessments(selectedModule.id);
    }
  }, [selectedModule]);

  async function fetchCourses() {
    setLoading(true);
    try {
      const data = await api.get<Course[]>('/courses');
      setCourses(data);
    } finally {
      setLoading(false);
    }
  }

  async function fetchModules(courseId: string) {
    const data = await api.get<Module[]>(`/courses/${courseId}/modules`);
    setModules(data);
  }

  async function fetchAssessments(moduleId: string) {
    setLoading(true);
    try {
      const data = await api.get<Assessment[]>(`/assessments/modules/${moduleId}`);
      setAssessments(data);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingAssessment(null);
    setShowModal(true);
  }

  function openEditModal(assessment: Assessment) {
    setEditingAssessment(assessment);
    setShowModal(true);
  }

  async function handleDelete(assessmentId: string) {
    if (!confirm('Are you sure you want to delete this assessment?')) return;
    await api.delete(`/assessments/${assessmentId}`);
    if (selectedModule) fetchAssessments(selectedModule.id);
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'mcq': return FileText;
      case 'coding': return Code;
      case 'assignment': return Upload;
      default: return FileText;
    }
  }

  if (selectedAssessment) {
    if (selectedAssessment.type === 'mcq') {
      return (
        <MCQAssessmentBuilder
          assessment={selectedAssessment}
          onBack={() => setSelectedAssessment(null)}
        />
      );
    } else if (selectedAssessment.type === 'coding') {
      return (
        <CodingAssessmentBuilder
          assessment={selectedAssessment}
          onBack={() => setSelectedAssessment(null)}
        />
      );
    } else if (selectedAssessment.type === 'assignment') {
      return (
        <AssignmentBuilder
          assessment={selectedAssessment}
          onBack={() => setSelectedAssessment(null)}
        />
      );
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Assessment Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Select Course</h2>
          {loading && !selectedCourse ? (
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
          ) : (
            <div className="space-y-2">
              {courses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => {
                    setSelectedCourse(course);
                    setSelectedModule(null);
                    setAssessments([]);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition ${
                    selectedCourse?.id === course.id
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {course.title}
                </button>
              ))}
              {courses.length === 0 && (
                <p className="text-sm text-gray-500">No courses available</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Select Module</h2>
          {selectedCourse ? (
            <div className="space-y-2">
              {modules.map((module) => (
                <button
                  key={module.id}
                  onClick={() => setSelectedModule(module)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition ${
                    selectedModule?.id === module.id
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {module.title}
                </button>
              ))}
              {modules.length === 0 && (
                <p className="text-sm text-gray-500">No modules in this course</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Select a course first</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Assessments</h2>
            {selectedModule && (
              <button
                onClick={openCreateModal}
                className="text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
          {selectedModule ? (
            loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
            ) : (
              <div className="space-y-2">
                {assessments.map((assessment) => {
                  const Icon = getTypeIcon(assessment.type);
                  return (
                    <div
                      key={assessment.id}
                      className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 flex-1">
                          <Icon className="w-4 h-4 text-gray-400 mt-1" />
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-900">{assessment.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                {assessment.type.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-500">
                                {assessment.total_marks} marks
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedAssessment(assessment)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Open builder"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(assessment)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(assessment.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {assessments.length === 0 && (
                  <p className="text-sm text-gray-500">No assessments yet</p>
                )}
              </div>
            )
          ) : (
            <p className="text-sm text-gray-500">Select a module first</p>
          )}
        </div>
      </div>

      {showModal && selectedModule && (
        <AssessmentModal
          moduleId={selectedModule.id}
          assessment={editingAssessment}
          onClose={() => {
            setShowModal(false);
            setEditingAssessment(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingAssessment(null);
            fetchAssessments(selectedModule.id);
          }}
        />
      )}
    </div>
  );
}

interface AssessmentModalProps {
  moduleId: string;
  assessment: Assessment | null;
  onClose: () => void;
  onSuccess: () => void;
}

function AssessmentModal({ moduleId, assessment, onClose, onSuccess }: AssessmentModalProps) {
  const [formData, setFormData] = useState({
    title: assessment?.title || '',
    type: assessment?.type || 'mcq' as 'mcq' | 'coding' | 'assignment',
    description: assessment?.description || '',
    duration_minutes: assessment?.duration_minutes || 60,
    total_marks: assessment?.total_marks || 100,
    passing_marks: assessment?.passing_marks || 40,
    randomize_questions: false,
    enable_negative_marking: false,
    negative_marks_per_question: 0,
    show_results_immediately: true,
    start_at: '',
    end_at: '',
    allowed_attempts: 1,
    resume_limit: 0,
    deadline: assessment?.deadline || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const assessmentData = {
        title: formData.title,
        type: formData.type,
        description: formData.description,
        duration_minutes: formData.duration_minutes,
        total_marks: formData.total_marks,
        passing_marks: formData.passing_marks,
        randomize_questions: formData.randomize_questions,
        enable_negative_marking: formData.enable_negative_marking,
        negative_marks_per_question: formData.negative_marks_per_question,
        show_results_immediately: formData.show_results_immediately,
        start_at: formData.start_at ? new Date(formData.start_at).toISOString() : null,
        end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
        allowed_attempts: formData.allowed_attempts,
        resume_limit: formData.resume_limit,
        deadline: formData.deadline || null,
      };

      if (assessment) {
        await api.put(`/assessments/${assessment.id}`, assessmentData);
      } else {
        await api.post(`/assessments/modules/${moduleId}`, assessmentData);
      }

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {assessment ? 'Edit Assessment' : 'Create New Assessment'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assessment Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'mcq' | 'coding' | 'assignment' })}
              disabled={!!assessment}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="mcq">Multiple Choice Questions (MCQ)</option>
              <option value="coding">Coding Test</option>
              <option value="assignment">Assignment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Marks
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.total_marks}
                onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passing Marks
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.passing_marks}
                onChange={(e) => setFormData({ ...formData, passing_marks: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deadline (optional)
              </label>
              <input
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {formData.type === 'coding' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Languages</label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {(['javascript','python','cpp','c','java','typescript'] as const).map(l => (
                  <label key={l} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(formData as any).allowed_languages?.includes(l) || false}
                      onChange={(e)=>{
                        const prev = (formData as any).allowed_languages || [];
                        const next = e.target.checked ? [...prev, l] : prev.filter((x: string)=>x!==l);
                        setFormData({ ...formData, allowed_languages: next } as any);
                      }}
                    />
                    <span className="capitalize">{l}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Attempts</label>
              <input type="number" min={1} value={(formData as any).allowed_attempts}
                onChange={(e)=> setFormData({ ...formData, allowed_attempts: parseInt(e.target.value)||1 } as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resume Limit</label>
              <input type="number" min={0} value={(formData as any).resume_limit}
                onChange={(e)=> setFormData({ ...formData, resume_limit: parseInt(e.target.value)||0 } as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start At (optional)</label>
              <input type="datetime-local" value={(formData as any).start_at}
                onChange={(e)=> setFormData({ ...formData, start_at: e.target.value } as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End At (optional)</label>
              <input type="datetime-local" value={(formData as any).end_at}
                onChange={(e)=> setFormData({ ...formData, end_at: e.target.value } as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>

          {formData.type === 'mcq' && (
            <>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="randomize"
                  checked={formData.randomize_questions}
                  onChange={(e) => setFormData({ ...formData, randomize_questions: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="randomize" className="ml-2 block text-sm text-gray-700">
                  Randomize question order
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="negative"
                  checked={formData.enable_negative_marking}
                  onChange={(e) => setFormData({ ...formData, enable_negative_marking: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="negative" className="ml-2 block text-sm text-gray-700">
                  Enable negative marking
                </label>
              </div>

              {formData.enable_negative_marking && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Negative marks per wrong answer
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={formData.negative_marks_per_question}
                    onChange={(e) => setFormData({ ...formData, negative_marks_per_question: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="show_results"
              checked={formData.show_results_immediately}
              onChange={(e) => setFormData({ ...formData, show_results_immediately: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="show_results" className="ml-2 block text-sm text-gray-700">
              Show results immediately after submission
            </label>
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
              {loading ? 'Saving...' : assessment ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
