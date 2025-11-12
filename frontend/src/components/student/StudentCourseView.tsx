// src/components/StudentCourseView.tsx
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { ChevronRight, ChevronDown, FileText, Video, File, Code, Loader2 } from 'lucide-react';
import StudentAssessmentView from './StudentAssessmentView';
import LessonViewer from './LessonViewer';

interface Course { id: string; title: string; description: string; }
interface Module { id: string; title: string; description: string; min_time_minutes: number }
interface Lesson { id: string; title: string; content_type: 'text'|'video'|'pdf'|'ppt'|'coding'; min_time_minutes: number; content_url?: string | null; content_text?: string | null }
interface Assessment { id: string; title: string; type: 'mcq'|'coding'|'assignment'; duration_minutes: number; total_marks: number; allowed_languages?: string[]; is_practice?: boolean }

export default function StudentCourseView({ course, onBack }: { course: Course; onBack: () => void }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [assessments, setAssessments] = useState<Record<string, Assessment[]>>({});
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);

  // Viewer state
  const [viewer, setViewer] = useState<{
    lesson: Lesson;
    index: number;
    list: Lesson[];
  } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await api.get<Module[]>(`/courses/${course.id}/modules`);
        setModules(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [course.id]);

  async function toggleModule(moduleId: string) {
    setOpen((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
    if (!open[moduleId]) {
      if (!lessons[moduleId]) {
        const ls = await api.get<Lesson[]>(`/courses/${course.id}/modules/${moduleId}/lessons`);
        setLessons((prev) => ({ ...prev, [moduleId]: ls }));
      }
      if (!assessments[moduleId]) {
        const as = await api.get<Assessment[]>(`/assessments/modules/${moduleId}`);
        setAssessments((prev) => ({ ...prev, [moduleId]: as }));
      }
    }
  }

  // Close viewer
  const closeViewer = () => setViewer(null);

  if (activeAssessment) {
    return <StudentAssessmentView assessment={activeAssessment} onBack={() => setActiveAssessment(null)} />;
  }

  if (viewer) {
    return (
      <LessonViewer
        lesson={viewer.lesson}
        hasPrev={viewer.index > 0}
        hasNext={viewer.index < viewer.list.length - 1}
        onPrev={() => {
          const prev = viewer.list[viewer.index - 1];
          setViewer({ ...viewer, lesson: prev, index: viewer.index - 1 });
        }}
        onNext={() => {
          const next = viewer.list[viewer.index + 1];
          setViewer({ ...viewer, lesson: next, index: viewer.index + 1 });
        }}
        onClose={closeViewer}
      />
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <button onClick={onBack} className="text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2 text-sm">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
        <p className="text-gray-600 mt-1">{course.description}</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
        </div>
      ) : (
        <div className="space-y-4">
          {modules.map((m) => (
            <div key={m.id} className="bg-white rounded-lg shadow overflow-hidden">
              <button
                onClick={() => toggleModule(m.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
              >
                <div>
                  <div className="font-semibold text-gray-900">{m.title}</div>
                  <div className="text-xs text-gray-500">Min time: {m.min_time_minutes} min</div>
                </div>
                {open[m.id] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>

              {open[m.id] && (
                <div className="border-t p-5 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Lessons */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Lessons</h3>
                    <div className="space-y-2">
                      {(lessons[m.id] || []).map((l, idx) => (
                        <LessonRow
                          key={l.id}
                          lesson={l}
                          allLessons={lessons[m.id] || []}
                          lessonIndex={idx}
                          onOpen={(lesson, index, list) => setViewer({ lesson, index, list })}
                        />
                      ))}
                      {(lessons[m.id] || []).length === 0 && (
                        <p className="text-sm text-gray-500">No lessons</p>
                      )}
                    </div>
                  </div>

                  {/* Practice Assessments */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Practice Assessments</h3>
                    <div className="space-y-2">
                      {(assessments[m.id] || [])
                        .filter((a: any) => a.is_practice)
                        .map((a: any) => (
                          <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                            <div className="text-sm text-gray-900">
                              {a.title} <span className="text-xs text-gray-500">({a.type})</span>
                            </div>
                            <button
                              onClick={() => setActiveAssessment(a)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Start
                            </button>
                          </div>
                        ))}
                      {(assessments[m.id] || []).filter((a: any) => a.is_practice).length === 0 && (
                        <p className="text-sm text-gray-500">No practice items</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {modules.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No modules available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Updated LessonRow
function LessonRow({
  lesson,
  allLessons,
  lessonIndex,
  onOpen,
}: {
  lesson: Lesson;
  allLessons: Lesson[];
  lessonIndex: number;
  onOpen: (lesson: Lesson, index: number, list: Lesson[]) => void;
}) {
  const Icon = {
    text: FileText,
    video: Video,
    coding: Code,
    pdf: File,
    ppt: File,
  }[lesson.content_type] || File;

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-gray-600" />
        <div>
          <div className="text-sm font-medium text-gray-900">{lesson.title}</div>
          {lesson.min_time_minutes > 0 && (
            <div className="text-xs text-gray-500">Min: {lesson.min_time_minutes} min</div>
          )}
        </div>
      </div>
      <button
        onClick={() => onOpen(lesson, lessonIndex, allLessons)}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        Open
      </button>
    </div>
  );
}