import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, FileText, Video, File, Code, Loader2 } from 'lucide-react';

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content_type: 'text' | 'video' | 'pdf' | 'ppt' | 'coding';
  content_url: string | null;
  content_text: string | null;
  order_index: number;
  min_time_minutes: number;
}

interface LessonManagementProps {
  moduleId: string;
  moduleName: string;
  onBack: () => void;
}

export default function LessonManagement({ moduleId, moduleName, onBack }: LessonManagementProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    fetchLessons();
  }, [moduleId]);

  async function fetchLessons() {
    setLoading(true);
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('module_id', moduleId)
      .order('order_index', { ascending: true });

    if (!error && data) {
      setLessons(data);
    }
    setLoading(false);
  }

  function openCreateModal() {
    setEditingLesson(null);
    setShowModal(true);
  }

  function openEditModal(lesson: Lesson) {
    setEditingLesson(lesson);
    setShowModal(true);
  }

  async function handleDelete(lessonId: string) {
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (!error) {
      fetchLessons();
    }
  }

  function getContentIcon(contentType: string) {
    switch (contentType) {
      case 'text': return FileText;
      case 'video': return Video;
      case 'pdf': return File;
      case 'ppt': return File;
      case 'coding': return Code;
      default: return FileText;
    }
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2"
        >
          ← Back to Modules
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Lessons - {moduleName}</h1>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          Add Lesson
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson, index) => {
            const Icon = getContentIcon(lesson.content_type);
            return (
              <div key={lesson.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="bg-green-100 text-green-600 font-bold rounded-full w-10 h-10 flex items-center justify-center">
                      {index + 1}
                    </div>
                    <div className="bg-gray-100 p-2 rounded">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500 capitalize">
                          {lesson.content_type}
                        </span>
                        {lesson.min_time_minutes > 0 && (
                          <span className="text-xs text-gray-400">
                            Min. Time: {lesson.min_time_minutes} min
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(lesson)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(lesson.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {lessons.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No lessons yet. Click "Add Lesson" to create one.
            </div>
          )}
        </div>
      )}

      {showModal && (
        <LessonModal
          moduleId={moduleId}
          lesson={editingLesson}
          nextOrderIndex={lessons.length}
          onClose={() => {
            setShowModal(false);
            setEditingLesson(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingLesson(null);
            fetchLessons();
          }}
        />
      )}
    </div>
  );
}

interface LessonModalProps {
  moduleId: string;
  lesson: Lesson | null;
  nextOrderIndex: number;
  onClose: () => void;
  onSuccess: () => void;
}

function LessonModal({ moduleId, lesson, nextOrderIndex, onClose, onSuccess }: LessonModalProps) {
  const [formData, setFormData] = useState({
    title: lesson?.title || '',
    content_type: lesson?.content_type || 'text' as 'text' | 'video' | 'pdf' | 'ppt' | 'coding',
    content_url: lesson?.content_url || '',
    content_text: lesson?.content_text || '',
    min_time_minutes: lesson?.min_time_minutes || 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const lessonData = {
        title: formData.title,
        content_type: formData.content_type,
        content_url: formData.content_type === 'text' ? null : formData.content_url || null,
        content_text: formData.content_type === 'text' ? formData.content_text : null,
        min_time_minutes: formData.min_time_minutes,
      };

      if (lesson) {
        const { error } = await supabase
          .from('lessons')
          .update(lessonData)
          .eq('id', lesson.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lessons')
          .insert([{
            ...lessonData,
            module_id: moduleId,
            order_index: nextOrderIndex,
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
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {lesson ? 'Edit Lesson' : 'Add New Lesson'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lesson Title
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
              Content Type
            </label>
            <select
              value={formData.content_type}
              onChange={(e) => setFormData({ ...formData, content_type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="text">Text</option>
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
              <option value="ppt">PowerPoint</option>
              <option value="coding">Coding Exercise</option>
            </select>
          </div>

          {formData.content_type === 'text' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                rows={8}
                value={formData.content_text}
                onChange={(e) => setFormData({ ...formData, content_text: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="Enter lesson content..."
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content URL
              </label>
              <input
                type="url"
                value={formData.content_url}
                onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload files to cloud storage and paste the URL here
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Time (minutes)
            </label>
            <input
              type="number"
              min="0"
              value={formData.min_time_minutes}
              onChange={(e) => setFormData({ ...formData, min_time_minutes: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              {loading ? 'Saving...' : lesson ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
