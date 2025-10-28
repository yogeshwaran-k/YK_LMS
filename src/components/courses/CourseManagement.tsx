import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit2, Trash2, Eye, Loader2, BookOpen, ChevronRight } from 'lucide-react';
import ModuleManagement from './ModuleManagement';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  is_published: boolean;
  enable_certificates: boolean;
  enable_gamification: boolean;
  created_at: string;
}

export default function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCourses(data);
    }
    setLoading(false);
  }

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function openCreateModal() {
    setEditingCourse(null);
    setShowModal(true);
  }

  function openEditModal(course: Course) {
    setEditingCourse(course);
    setShowModal(true);
  }

  async function handleDelete(courseId: string) {
    if (!confirm('Are you sure you want to delete this course? This will also delete all modules, lessons, and assessments.')) return;

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (!error) {
      fetchCourses();
    }
  }

  if (selectedCourse) {
    return (
      <ModuleManagement
        courseId={selectedCourse.id}
        courseName={selectedCourse.title}
        onBack={() => setSelectedCourse(null)}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          Create Course
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredCourses.map((course) => (
              <div key={course.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-2">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCourse(course)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Manage Modules"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(course)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1">{course.title}</h3>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{course.description}</p>

                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                    {course.category}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    course.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {course.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>

                <div className="flex gap-2 text-xs text-gray-500">
                  {course.enable_certificates && (
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Certificates
                    </span>
                  )}
                  {course.enable_gamification && (
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Gamification
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredCourses.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No courses found
          </div>
        )}
      </div>

      {showModal && (
        <CourseModal
          course={editingCourse}
          onClose={() => {
            setShowModal(false);
            setEditingCourse(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingCourse(null);
            fetchCourses();
          }}
        />
      )}
    </div>
  );
}

interface CourseModalProps {
  course: Course | null;
  onClose: () => void;
  onSuccess: () => void;
}

function CourseModal({ course, onClose, onSuccess }: CourseModalProps) {
  const [formData, setFormData] = useState({
    title: course?.title || '',
    description: course?.description || '',
    category: course?.category || 'general',
    is_published: course?.is_published ?? false,
    enable_certificates: course?.enable_certificates ?? false,
    enable_gamification: course?.enable_gamification ?? false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userId = sessionStorage.getItem('lms_user_id');

      if (course) {
        const { error } = await supabase
          .from('courses')
          .update(formData)
          .eq('id', course.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('courses')
          .insert([{
            ...formData,
            created_by: userId,
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
      <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {course ? 'Edit Course' : 'Create New Course'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Title
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
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="general">General</option>
              <option value="labs">Labs</option>
              <option value="semester_exams">Semester Exams</option>
              <option value="aptitude">Aptitude</option>
              <option value="communication">Communication</option>
              <option value="coding">Coding</option>
              <option value="placement">Placement</option>
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_published"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_published" className="ml-2 block text-sm text-gray-700">
                Publish course (make visible to assigned students)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enable_certificates"
                checked={formData.enable_certificates}
                onChange={(e) => setFormData({ ...formData, enable_certificates: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="enable_certificates" className="ml-2 block text-sm text-gray-700">
                Enable certificates
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enable_gamification"
                checked={formData.enable_gamification}
                onChange={(e) => setFormData({ ...formData, enable_gamification: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="enable_gamification" className="ml-2 block text-sm text-gray-700">
                Enable gamification
              </label>
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
              {loading ? 'Saving...' : course ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
