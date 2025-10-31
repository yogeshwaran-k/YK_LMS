import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { ChevronRight, ChevronDown, FileText, Video, File, Code, Loader2 } from 'lucide-react';
import StudentAssessmentView from './StudentAssessmentView';

interface Course { id: string; title: string; description: string; }
interface Module { id: string; title: string; description: string; min_time_minutes: number }
interface Lesson { id: string; title: string; content_type: 'text'|'video'|'pdf'|'ppt'|'coding'; min_time_minutes: number; content_url?: string | null; content_text?: string | null }
interface Assessment { id: string; title: string; type: 'mcq'|'coding'|'assignment'; duration_minutes: number; total_marks: number; allowed_languages?: string[] }

export default function StudentCourseView({ course, onBack }: { course: Course; onBack: () => void }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [assessments, setAssessments] = useState<Record<string, Assessment[]>>({});
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);

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


  if (activeAssessment) {
    return <StudentAssessmentView assessment={activeAssessment} onBack={()=>setActiveAssessment(null)} />;
  }

  return (
    <div>
      <div className="mb-6">
        <button onClick={onBack} className="text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
        <p className="text-gray-600">{course.description}</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((m) => (
            <div key={m.id} className="bg-white rounded-lg shadow">
              <button onClick={() => toggleModule(m.id)} className="w-full flex items-center justify-between p-4 text-left">
                <div>
                  <div className="font-semibold text-gray-900">{m.title}</div>
                  <div className="text-xs text-gray-500">Min time: {m.min_time_minutes} min</div>
                </div>
                {open[m.id] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
              {open[m.id] && (
                <div className="border-t p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Lessons</h3>
                    <div className="space-y-2">
                      {(lessons[m.id] || []).map((l) => (
                        <LessonRow key={l.id} lesson={l} />
                      ))}
                      {(lessons[m.id] || []).length === 0 && (
                        <div className="text-sm text-gray-500">No lessons</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Practice Assessments</h3>
                    <div className="space-y-2">
                      {(assessments[m.id]||[]).filter((a:any)=> a.is_practice).map((a:any)=> (
                        <div key={a.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="text-sm text-gray-900">{a.title} ({a.type})</div>
                          <button onClick={()=> setActiveAssessment(a)} className="text-blue-600 hover:text-blue-800 text-sm">Start</button>
                        </div>
                      ))}
                      {(assessments[m.id]||[]).filter((a:any)=> a.is_practice).length===0 && (
                        <div className="text-sm text-gray-500">No practice items</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {modules.length === 0 && (
            <div className="bg-white rounded-lg shadow p-6 text-gray-500">No modules</div>
          )}
        </div>
      )}
    </div>
  );
}

function LessonRow({ lesson }: { lesson: Lesson }) {
  const [open, setOpen] = useState(false);
  function handleOpen() {
    if (lesson.content_type === 'text') {
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`<html><head><title>${lesson.title}</title><meta charset=\"utf-8\"/></head><body style=\"font-family: sans-serif; padding:16px; white-space:pre-wrap\">${(lesson.content_text||'').replace(/</g,'&lt;')}</body></html>`);
        w.document.close();
      }
    } else if (lesson.content_type !== 'coding' && lesson.content_url) {
      window.open(lesson.content_url, '_blank');
    }
  }
  return (
    <div>
      <div className="flex items-center gap-3 p-2 border rounded justify-between">
        <div className="flex items-center gap-3">
          {(lesson.content_type === 'text' ? <FileText className="w-4 h-4 text-gray-600" /> : lesson.content_type === 'video' ? <Video className="w-4 h-4 text-gray-600" /> : lesson.content_type === 'coding' ? <Code className="w-4 h-4 text-gray-600" /> : <File className="w-4 h-4 text-gray-600" />)}
          <div>
            <div className="text-sm text-gray-900">{lesson.title}</div>
            {lesson.min_time_minutes > 0 && (
              <div className="text-xs text-gray-500">Min time: {lesson.min_time_minutes} min</div>
            )}
          </div>
        </div>
        <button onClick={handleOpen} className="text-blue-600 hover:text-blue-800 text-sm">Open</button>
      </div>
      {open && (
        <div className="mt-2 p-3 border rounded bg-gray-50 text-sm text-gray-800 whitespace-pre-wrap">
          {lesson.content_text || 'No text content.'}
          <div className="mt-2">
            <button onClick={()=>setOpen(false)} className="text-blue-600 hover:text-blue-800 text-xs">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
