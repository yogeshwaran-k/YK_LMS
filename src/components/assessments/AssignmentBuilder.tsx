import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Upload, FileText } from 'lucide-react';

interface Assignment {
  id: string;
  assessment_id: string;
  title: string;
  description: string;
  max_file_size_mb: number;
  allowed_file_types: string[];
  deadline: string | null;
}

interface AssignmentBuilderProps {
  assessment: {
    id: string;
    title: string;
  };
  onBack: () => void;
}

export default function AssignmentBuilder({ assessment, onBack }: AssignmentBuilderProps) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetchAssignment();
  }, [assessment.id]);

  async function fetchAssignment() {
    setLoading(true);
    const { data } = await supabase
      .from('assignments')
      .select('*')
      .eq('assessment_id', assessment.id)
      .maybeSingle();

    if (data) {
      setAssignment(data);
    } else {
      setEditing(true);
    }
    setLoading(false);
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
        <h1 className="text-2xl font-bold text-gray-900">Assignment - {assessment.title}</h1>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        </div>
      ) : editing || !assignment ? (
        <AssignmentForm
          assessmentId={assessment.id}
          assignment={assignment}
          onSuccess={() => {
            setEditing(false);
            fetchAssignment();
          }}
          onCancel={() => {
            if (assignment) {
              setEditing(false);
            }
          }}
        />
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{assignment.title}</h2>
                {assignment.deadline && (
                  <p className="text-sm text-gray-500 mt-1">
                    Deadline: {new Date(assignment.deadline).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Edit
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{assignment.description}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Submission Rules</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Maximum file size: {assignment.max_file_size_mb} MB</p>
                <div>
                  <p className="mb-1">Allowed file types:</p>
                  <div className="flex flex-wrap gap-2">
                    {assignment.allowed_file_types.map((type) => (
                      <span key={type} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        .{type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface AssignmentFormProps {
  assessmentId: string;
  assignment: Assignment | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function AssignmentForm({ assessmentId, assignment, onSuccess, onCancel }: AssignmentFormProps) {
  const [formData, setFormData] = useState({
    title: assignment?.title || '',
    description: assignment?.description || '',
    max_file_size_mb: assignment?.max_file_size_mb || 10,
    allowed_file_types: assignment?.allowed_file_types?.join(', ') || 'pdf, doc, docx, txt, zip',
    deadline: assignment?.deadline || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fileTypes = formData.allowed_file_types
        .split(',')
        .map(t => t.trim().replace(/^\./, ''))
        .filter(t => t.length > 0);

      const assignmentData = {
        title: formData.title,
        description: formData.description,
        max_file_size_mb: formData.max_file_size_mb,
        allowed_file_types: fileTypes,
        deadline: formData.deadline || null,
      };

      if (assignment) {
        const { error } = await supabase
          .from('assignments')
          .update(assignmentData)
          .eq('id', assignment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('assignments')
          .insert([{
            ...assignmentData,
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
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        {assignment ? 'Edit Assignment' : 'Create Assignment'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assignment Title
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
            Description & Instructions
          </label>
          <textarea
            rows={8}
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Provide detailed instructions for the assignment..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum File Size (MB)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              required
              value={formData.max_file_size_mb}
              onChange={(e) => setFormData({ ...formData, max_file_size_mb: parseInt(e.target.value) || 10 })}
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Allowed File Types
          </label>
          <input
            type="text"
            required
            value={formData.allowed_file_types}
            onChange={(e) => setFormData({ ...formData, allowed_file_types: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="pdf, doc, docx, txt, zip"
          />
          <p className="text-xs text-gray-500 mt-1">
            Comma-separated list of file extensions (without dots)
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          {assignment && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : assignment ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
