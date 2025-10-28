import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Plus, Edit2, Trash2, ChevronRight, Loader2 } from 'lucide-react';
import LessonManagement from './LessonManagement';

interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
  min_time_minutes: number;
}

interface ModuleManagementProps {
  courseId: string;
  courseName: string;
  onBack: () => void;
}

export default function ModuleManagement({ courseId, courseName, onBack }: ModuleManagementProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);

  useEffect(() => {
    fetchModules();
  }, [courseId]);

  async function fetchModules() {
    setLoading(true);
    try {
      const data = await api.get<Module[]>(`/courses/${courseId}/modules`);
      setModules(data);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingModule(null);
    setShowModal(true);
  }

  function openEditModal(module: Module) {
    setEditingModule(module);
    setShowModal(true);
  }

  async function handleDelete(moduleId: string) {
    if (!confirm('Are you sure you want to delete this module? This will also delete all lessons and assessments.')) return;
    await api.delete(`/courses/${courseId}/modules/${moduleId}`);
    fetchModules();
  }

  if (selectedModule) {
    return (
      <LessonManagement
        courseId={courseId}
        moduleId={selectedModule.id}
        moduleName={selectedModule.title}
        onBack={() => setSelectedModule(null)}
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2"
        >
          ← Back to Courses
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Modules - {courseName}</h1>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          Add Module
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((module, index) => (
            <div key={module.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="bg-blue-100 text-blue-600 font-bold rounded-full w-10 h-10 flex items-center justify-center">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{module.title}</h3>
                    <p className="text-sm text-gray-500">{module.description}</p>
                    {module.min_time_minutes > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Min. Time: {module.min_time_minutes} minutes
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedModule(module)}
                    className="text-blue-600 hover:text-blue-900 px-3 py-2 rounded hover:bg-blue-50"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => openEditModal(module)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(module.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {modules.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No modules yet. Click "Add Module" to create one.
            </div>
          )}
        </div>
      )}

      {showModal && (
        <ModuleModal
          courseId={courseId}
          module={editingModule}
          nextOrderIndex={modules.length}
          onClose={() => {
            setShowModal(false);
            setEditingModule(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingModule(null);
            fetchModules();
          }}
        />
      )}
    </div>
  );
}

interface ModuleModalProps {
  courseId: string;
  module: Module | null;
  nextOrderIndex: number;
  onClose: () => void;
  onSuccess: () => void;
}

function ModuleModal({ courseId, module, nextOrderIndex, onClose, onSuccess }: ModuleModalProps) {
  const [formData, setFormData] = useState({
    title: module?.title || '',
    description: module?.description || '',
    min_time_minutes: module?.min_time_minutes || 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (module) {
        await api.put(`/courses/${courseId}/modules/${module.id}`, formData);
      } else {
        await api.post(`/courses/${courseId}/modules`, { ...formData, order_index: nextOrderIndex });
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
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {module ? 'Edit Module' : 'Add New Module'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Module Title
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
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

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
              {loading ? 'Saving...' : module ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
