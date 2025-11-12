import React, { useState, useEffect, useMemo } from 'react';
// Assuming 'api' is configured to fetch real data
import { api } from '../../lib/api'; 
import { 
  Plus, Edit2, Trash2, ChevronRight, Loader2, FileText, Code, Upload, 
  Calendar, Clock, Trophy, Shuffle, MinusCircle, Eye, CheckCircle, Search 
} from 'lucide-react';
import MCQAssessmentBuilder from './MCQAssessmentBuilder';
import CodingAssessmentBuilder from './CodingAssessmentBuilder';  
import AssignmentBuilder from './AssignmentBuilder';



// --------------------------------------------------------------------------
// 🎨 GLOBAL MONOCHROME CSS VARIABLES (as JS Constants)
// --------------------------------------------------------------------------

const COLORS = {
  // Primary (Monochrome Blue/Gray focus - easily changeable)
  primary: 'indigo', 
  primary_50: 'indigo-50',
  primary_100: 'indigo-100',
  primary_500: 'indigo-500',
  primary_600: 'indigo-600',
  primary_700: 'indigo-700',
  primary_900: 'indigo-900',
  
  // Accent 1 (Success/Module)
  accent1: 'emerald',
  accent1_50: 'emerald-50',
  accent1_100: 'emerald-100',
  accent1_600: 'emerald-600',
  accent1_700: 'emerald-700',
  
  // Accent 2 (Warning/Scoring)
  accent2: 'amber',
  accent2_100: 'amber-100',
  accent2_500: 'amber-500',
  accent2_600: 'amber-600',
  accent2_700: 'amber-700',

  // Type Colors (MCQ, Coding, Assignment)
  type_mcq: 'blue',
  type_coding: 'green',
  type_assignment: 'purple',

  // Alert/Error
  error: 'red',
  error_50: 'red-50',
  error_600: 'red-600',
  error_700: 'red-700',

  // Info/Results
  info: 'teal',
  info_50: 'teal-50',
  info_500: 'teal-500',
  info_600: 'teal-600',
};


// --------------------------------------------------------------------------
// INTERFACES
// --------------------------------------------------------------------------

type LanguageKey = 'python' | 'java' | 'javascript' | 'c_cpp';

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
  randomize_questions?: boolean;
  enable_negative_marking?: boolean;
  negative_marks_per_question?: number;
  show_results_immediately?: boolean;
  start_at?: string;
  end_at?: string;
  allowed_attempts?: number;
  resume_limit?: number;
  results_release_mode?: 'now' | 'at' | 'after_submission';
  results_release_at?: string;
  results_show?: 'mark' | 'mark_analysis';
  disable_copy_paste?: boolean;
  tab_switch_limit?: number | null;
  is_practice?: boolean;
  allowed_languages?: LanguageKey[]; 
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

interface AssessmentModalProps {
  moduleId: string;
  assessment: Assessment | null;
  onClose: () => void;
  onSuccess: () => void;
}

// --------------------------------------------------------------------------
// MAIN COMPONENT: AssessmentManagement
// --------------------------------------------------------------------------

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

  // Search states
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [moduleSearchTerm, setModuleSearchTerm] = useState('');
  const [assessmentSearchTerm, setAssessmentSearchTerm] = useState('');

  // --- Data Fetching Hooks ---
  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchModules(selectedCourse.id);
      setSelectedModule(null);
      setAssessments([]);
      setModuleSearchTerm('');
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedModule) {
      fetchAssessments(selectedModule.id);
      setAssessmentSearchTerm('');
    }
  }, [selectedModule]);

  // --- API Functions ---
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
    setLoading(true);
    try {
      const data = await api.get<Module[]>(`/courses/${courseId}/modules`);
      setModules(data);
    } finally {
      setLoading(false);
    }
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

  // --- Filtering Logic using useMemo ---
  const filteredCourses = useMemo(() => {
    if (!courseSearchTerm) return courses;
    const term = courseSearchTerm.toLowerCase();
    return courses.filter(course => course.title.toLowerCase().includes(term));
  }, [courses, courseSearchTerm]);

  const filteredModules = useMemo(() => {
    if (!moduleSearchTerm) return modules;
    const term = moduleSearchTerm.toLowerCase();
    return modules.filter(module => module.title.toLowerCase().includes(term));
  }, [modules, moduleSearchTerm]);

  const filteredAssessments = useMemo(() => {
    if (!assessmentSearchTerm) return assessments;
    const term = assessmentSearchTerm.toLowerCase();
    return assessments.filter(assessment => assessment.title.toLowerCase().includes(term));
  }, [assessments, assessmentSearchTerm]);


  // --- Action Handlers ---
  function openCreateModal() {
    if (!selectedModule) return; 
    setEditingAssessment(null);
    setShowModal(true);
  }

  function openEditModal(assessment: Assessment) {
    setEditingAssessment(assessment);
    setShowModal(true);
  }

  async function handleDelete(assessmentId: string) {
    if (!confirm('Are you sure you want to delete this assessment? This action cannot be undone.')) return;
    try {
      setLoading(true);
      await api.delete(`/assessments/${assessmentId}`);
      if (selectedModule) fetchAssessments(selectedModule.id);
    } catch (e) {
      console.error("Deletion failed:", e);
      alert("Failed to delete assessment.");
    } finally {
      setLoading(false);
    }
  }

  function getTypeConfig(type: string) {
    let colorClass, label;
    let Icon = FileText;
    
    switch (type) {
      case 'mcq': 
        Icon = FileText; 
        colorClass = `bg-${COLORS.type_mcq}-100 text-${COLORS.type_mcq}-700 border-${COLORS.type_mcq}-200`; 
        label = 'MCQ'; 
        break;
      case 'coding': 
        Icon = Code; 
        colorClass = `bg-${COLORS.type_coding}-100 text-${COLORS.type_coding}-700 border-${COLORS.type_coding}-200`; 
        label = 'Coding'; 
        break;
      case 'assignment': 
        Icon = Upload; 
        colorClass = `bg-${COLORS.type_assignment}-100 text-${COLORS.type_assignment}-700 border-${COLORS.type_assignment}-200`; 
        label = 'Assignment'; 
        break;
      default: 
        Icon = FileText; 
        colorClass = 'bg-gray-100 text-gray-700 border-gray-200'; 
        label = 'Unknown';
    }
    return { Icon, colorClass, label };
  }

  // 🐛 FIX: This is the logic for switching to the Builder component
  if (selectedAssessment) {
    const Builder = {
      mcq: MCQAssessmentBuilder,
      coding: CodingAssessmentBuilder,
      assignment: AssignmentBuilder,
    }[selectedAssessment.type];

    if (Builder) {
      return <Builder assessment={selectedAssessment} onBack={() => setSelectedAssessment(null)} />;
    } else {
      return (
        <div className="p-8 bg-white shadow-xl rounded-xl text-center text-red-500">
          Error: Assessment builder for type "{selectedAssessment.type}" not found.
          <button onClick={() => setSelectedAssessment(null)} className={`mt-4 block mx-auto p-2 text-${COLORS.primary_600} hover:text-${COLORS.primary_700}`}>
            Go Back
          </button>
        </div>
      );
    }
  }

  // Main Assessment Management UI
  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Assessment Management</h1>
          <p className="mt-1 text-sm text-gray-600">Create and manage assessments across courses and modules</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 1. Course Selector */}
          <div className={`bg-white rounded-xl shadow-lg border-t-4 border-${COLORS.primary_600} p-5`}>
            <h2 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
              <div className={`w-8 h-8 bg-${COLORS.primary_100} rounded-lg flex items-center justify-center`}>
                <FileText className={`w-5 h-5 text-${COLORS.primary_600}`} />
              </div>
              Select Course
            </h2>
            
            {/* Course Search Input */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search courses..."
                value={courseSearchTerm}
                onChange={(e) => setCourseSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-${COLORS.primary_500} focus:border-${COLORS.primary_500} transition text-sm`}
              />
            </div>
            
            {loading && !selectedCourse ? (
              <SkeletonList count={3} />
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {filteredCourses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => {
                      setSelectedCourse(course);
                      setCourseSearchTerm('');
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-between group ${
                      selectedCourse?.id === course.id
                        ? `bg-${COLORS.primary_50} text-${COLORS.primary_700} font-bold border-2 border-${COLORS.primary}-400 shadow-inner`
                        : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                    }`}
                  >
                    <span className="truncate">{course.title}</span>
                    {selectedCourse?.id === course.id && (
                      <CheckCircle className={`w-5 h-5 text-${COLORS.primary_600} flex-shrink-0`} />
                    )}
                  </button>
                ))}
                {filteredCourses.length === 0 && <EmptyState message={courseSearchTerm ? "No matching courses found" : "No courses available"} />}
              </div>
            )}
          </div>

          {/* 2. Module Selector */}
          <div className={`bg-white rounded-xl shadow-lg border-t-4 ${selectedCourse ? `border-${COLORS.accent1_600}` : 'border-gray-300'} p-5`}>
            <h2 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
              <div className={`w-8 h-8 bg-${COLORS.accent1_100} rounded-lg flex items-center justify-center`}>
                <ChevronRight className={`w-5 h-5 text-${COLORS.accent1_600}`} />
              </div>
              Select Module
            </h2>

            {/* Module Search Input */}
            {selectedCourse && (
              <div className="relative mb-4">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search modules..."
                  value={moduleSearchTerm}
                  onChange={(e) => setModuleSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-${COLORS.accent1_600} focus:border-${COLORS.accent1_600} transition text-sm`}
                  disabled={!selectedCourse}
                />
              </div>
            )}

            {selectedCourse ? (
              loading && !selectedModule ? (
                <SkeletonList count={2} />
              ) : filteredModules.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {filteredModules.map((module) => (
                    <button
                      key={module.id}
                      onClick={() => {
                        setSelectedModule(module);
                        setModuleSearchTerm('');
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-between group ${
                        selectedModule?.id === module.id
                          ? `bg-${COLORS.accent1_50} text-${COLORS.accent1_700} font-bold border-2 border-${COLORS.accent1}-400 shadow-inner`
                          : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                      }`}
                    >
                      <span className="truncate">{module.title}</span>
                      {selectedModule?.id === module.id && (
                        <CheckCircle className={`w-5 h-5 text-${COLORS.accent1_600} flex-shrink-0`} />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState message={moduleSearchTerm ? "No matching modules found" : "No modules in this course"} />
              )
            ) : (
              <p className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-lg">← Select a course first to load modules</p>
            )}
          </div>

          {/* 3. Assessments List */}
          <div className={`bg-white rounded-xl shadow-lg border-t-4 ${selectedModule ? `border-${COLORS.accent2_600}` : 'border-gray-300'} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <div className={`w-8 h-8 bg-${COLORS.accent2_100} rounded-lg flex items-center justify-center`}>
                  <Trophy className={`w-5 h-5 text-${COLORS.accent2_600}`} />
                </div>
                Assessments
              </h2>
              <button
                onClick={openCreateModal}
                disabled={!selectedModule}
                className={`p-2 bg-${COLORS.primary_600} text-white rounded-xl hover:bg-${COLORS.primary_700} transition-shadow shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:shadow-none`}
                title={selectedModule ? "Create new assessment" : "Select a module first"}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Assessment Search Input */}
            {selectedModule && (
              <div className="relative mb-4">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search assessments..."
                  value={assessmentSearchTerm}
                  onChange={(e) => setAssessmentSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-${COLORS.accent2_600} focus:border-${COLORS.accent2_600} transition text-sm`}
                  disabled={!selectedModule}
                />
              </div>
            )}

            {selectedModule ? (
              loading ? (
                <SkeletonList count={3} />
              ) : filteredAssessments.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {filteredAssessments.map((assessment) => {
                    const { Icon, colorClass, label } = getTypeConfig(assessment.type);

                    return (
                      <div
                        key={assessment.id}
                        className={`group border-2 border-gray-100 rounded-xl p-4 hover:border-${COLORS.primary_500} hover:shadow-md transition-all duration-200`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass.split(' ')[0]}`}>
                              <Icon className={`w-5 h-5 ${colorClass.split(' ')[1]}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">{assessment.title}</h3>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${colorClass}`}>
                                  {label}
                                </span>
                                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                                  <Trophy className={`w-3.5 h-3.5 text-${COLORS.accent2_500}`} />
                                  {assessment.total_marks} marks
                                </span>
                                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                                  {assessment.duration_minutes}m
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 transition-opacity opacity-70 group-hover:opacity-100">
                            {/* Button to enter the Question Builder */}
                            <button
                              onClick={() => setSelectedAssessment(assessment)}
                              className={`p-1.5 text-${COLORS.primary_600} hover:bg-${COLORS.primary_50} rounded-lg transition`}
                              title="Open builder (Add/Edit Questions)"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => openEditModal(assessment)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                              title="Edit Settings"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(assessment.id)}
                              className={`p-1.5 text-${COLORS.error_600} hover:bg-${COLORS.error_50} rounded-lg transition`}
                              title="Delete Assessment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  message={assessmentSearchTerm ? "No matching assessments found" : "No assessments found in this module"}
                  action={openCreateModal}
                  actionText="Create your first assessment"
                />
              )
            ) : (
              <p className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-lg">← Select a module to view assessments</p>
            )}
          </div>
        </div>
      </div>

      {/* Assessment Modal */}
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

// --------------------------------------------------------------------------
// HELPER COMPONENTS
// --------------------------------------------------------------------------

// Skeleton Loader
function SkeletonList({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded-xl"></div>
        </div>
      ))}
    </div>
  );
}

// Empty State
function EmptyState({ message, action, actionText }: { message: string; action?: () => void; actionText?: string }) {
  return (
    <div className="text-center py-12 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
      <div className="bg-gray-100 w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center">
        <FileText className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-600 mb-3">{message}</p>
      {action && actionText && (
        <button
          onClick={action}
          className={`text-sm px-3 py-1 bg-${COLORS.primary_50} text-${COLORS.primary_600} border border-${COLORS.primary}-200 rounded-lg hover:bg-${COLORS.primary_100} font-medium transition`}
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// ENHANCED MODAL COMPONENT
// --------------------------------------------------------------------------

// New constant for language options (for Coding assessments)
const CODE_LANGUAGES: { value: LanguageKey, label: string }[] = [
  { value: 'python', label: 'Python 3' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript (Node)' },
  { value: 'c_cpp', label: 'C/C++' },
];

// Helper to format ISO date string for datetime-local input
const toDateTimeLocal = (isoString: string | undefined | null): string => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    
    const pad = (n: number) => String(n).padStart(2, '0');
    
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
};


function AssessmentModal({ moduleId, assessment, onClose, onSuccess }: AssessmentModalProps) {
  const defaultSettings = (() => {
    try { return JSON.parse(localStorage.getItem('app_settings') || '{}'); }
    catch { return {}; }
  })();

  const [formData, setFormData] = useState({
    title: assessment?.title || '',
    type: assessment?.type || 'mcq' as 'mcq' | 'coding' | 'assignment',
    description: assessment?.description || '',
    duration_minutes: assessment?.duration_minutes || 60,
    total_marks: assessment?.total_marks || 100,
    passing_marks: assessment?.passing_marks || 40,
    
    // MCQ specific
    randomize_questions: assessment?.randomize_questions ?? false,
    enable_negative_marking: assessment?.enable_negative_marking ?? false,
    negative_marks_per_question: assessment?.negative_marks_per_question ?? 0,
    
    // Scheduling
    start_at: toDateTimeLocal(assessment?.start_at),
    end_at: toDateTimeLocal(assessment?.end_at),
    deadline: toDateTimeLocal(assessment?.deadline),
    
    // Attempts & Resumption
    allowed_attempts: assessment?.allowed_attempts ?? 1,
    resume_limit: assessment?.resume_limit ?? 1,
    is_practice: assessment?.is_practice ?? false,

    // Results
    results_release_mode: assessment?.results_release_mode ?? 'now',
    results_release_at: toDateTimeLocal(assessment?.results_release_at),
    results_show: assessment?.results_show ?? 'mark',
    
    // Proctoring
    disable_copy_paste: assessment?.disable_copy_paste ?? (defaultSettings.disable_copy_paste ?? false),
    tab_switch_limit: assessment?.tab_switch_limit ?? (defaultSettings.tab_switch_limit ?? null),
    
    // Coding specific
    allowed_languages: assessment?.allowed_languages || ([] as LanguageKey[]),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle change for generic inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
                ? checked 
                : type === 'number' 
                  ? parseInt(value) || (value === '' ? null : 0)
                  : value,
    }));
  };
  
  // Handle change for the new language checkboxes
  const handleLanguageCheckboxChange = (language: LanguageKey, checked: boolean) => {
    setFormData(prev => {
      let newLanguages: LanguageKey[];
      if (checked) {
        newLanguages = [...prev.allowed_languages, language];
      } else {
        newLanguages = prev.allowed_languages.filter(lang => lang !== language);
      }
      return { ...prev, allowed_languages: newLanguages };
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Basic validation for coding languages
    if (formData.type === 'coding' && formData.allowed_languages.length === 0) {
      setError('You must select at least one allowed coding language.');
      return;
    }
    
    setLoading(true);

    try {
      // Data transformation for API submission
      const assessmentData = {
        module_id: moduleId,
        title: formData.title,
        type: formData.type,
        description: formData.description,
        duration_minutes: formData.duration_minutes,
        total_marks: formData.total_marks,
        passing_marks: formData.passing_marks,
        
        // Conditional fields:
        randomize_questions: formData.type === 'mcq' ? formData.randomize_questions : undefined,
        enable_negative_marking: formData.type === 'mcq' ? formData.enable_negative_marking : undefined,
        negative_marks_per_question: formData.type === 'mcq' ? formData.negative_marks_per_question : undefined,
        allowed_languages: formData.type === 'coding' ? formData.allowed_languages : undefined,
        
        // Date/Time conversion to ISO string for API
        start_at: formData.start_at ? new Date(formData.start_at).toISOString() : null,
        end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
        deadline: formData.type === 'assignment' && formData.deadline ? new Date(formData.deadline).toISOString() : null,
        
        allowed_attempts: formData.allowed_attempts,
        resume_limit: formData.resume_limit,
        is_practice: formData.is_practice,
        
        results_release_mode: formData.results_release_mode,
        results_release_at: formData.results_release_mode === 'at' && formData.results_release_at ? new Date(formData.results_release_at).toISOString() : null,
        results_show: formData.results_show,
        
        disable_copy_paste: formData.disable_copy_paste,
        tab_switch_limit: formData.tab_switch_limit === null || formData.tab_switch_limit === undefined ? null : Number(formData.tab_switch_limit),
      };

      if (assessment) {
        await api.put(`/assessments/${assessment.id}`, assessmentData);
      } else {
        await api.post(`/assessments/modules/${moduleId}`, { ...assessmentData, module_id: moduleId });
      }

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while saving.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 max-h-[95vh] overflow-y-auto transform transition-all duration-300 scale-100 ease-out">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-5 rounded-t-2xl z-10 flex justify-between items-center">
          <h2 className="text-2xl font-extrabold text-gray-900">
            {assessment ? 'Edit Assessment Settings' : 'Create New Assessment'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">
             <MinusCircle className="w-6 h-6 rotate-45" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {error && (
            <div className={`bg-${COLORS.error_50} border border-${COLORS.error}-300 text-${COLORS.error_700} px-4 py-3 rounded-xl text-sm flex items-center gap-2`}>
              <MinusCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* === Basic Info === */}
          <section className="space-y-5 border-b pb-8">
            <h3 className={`text-xl font-bold text-${COLORS.primary_700} flex items-center gap-3`}>
              <FileText className={`w-6 h-6 text-${COLORS.primary_500}`} />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-${COLORS.primary_500} focus:border-${COLORS.primary_500} transition`}
                  placeholder="e.g., Midterm Exam"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  disabled={!!assessment}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-${COLORS.primary_500} focus:border-${COLORS.primary_500} disabled:bg-gray-100 disabled:cursor-not-allowed`}
                >
                  <option value="mcq">Multiple Choice (MCQ)</option>
                  <option value="coding">Coding Test</option>
                  <option value="assignment">Assignment</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <textarea
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-${COLORS.primary_500} focus:border-${COLORS.primary_500} resize-none`}
                placeholder="Brief description and instructions..."
              />
            </div>
          </section>

          {/* === Scoring & Duration === */}
          <section className="space-y-5 border-b pb-8">
            <h3 className={`text-xl font-bold text-${COLORS.accent2_700} flex items-center gap-3`}>
              <Trophy className={`w-6 h-6 text-${COLORS.accent2_500}`} />
              Scoring & Duration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Duration */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (mins) *</label>
                <input
                  type="number"
                  name="duration_minutes"
                  min="1"
                  required
                  value={formData.duration_minutes}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-${COLORS.primary_500}`}
                />
              </div>
              {/* Total Marks */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Total Marks *</label>
                <input
                  type="number"
                  name="total_marks"
                  min="1"
                  required
                  value={formData.total_marks}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-${COLORS.primary_500}`}
                />
              </div>
              {/* Passing Marks */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Passing Marks *</label>
                <input
                  type="number"
                  name="passing_marks"
                  min="0"
                  required
                  value={formData.passing_marks}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-${COLORS.primary_500}`}
                />
              </div>
            </div>
          </section>

          {/* === Scheduling & Attempts === */}
          <section className="space-y-5 border-b pb-8">
            <h3 className={`text-xl font-bold text-${COLORS.type_assignment}-700 flex items-center gap-3`}>
              <Calendar className={`w-6 h-6 text-${COLORS.type_assignment}-500`} />
              Scheduling & Attempts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Start At */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Start At (optional)</label>
                <input
                  type="datetime-local"
                  name="start_at"
                  value={formData.start_at}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-${COLORS.primary_500}`}
                />
              </div>
              {/* End At */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">End At (optional)</label>
                <input
                  type="datetime-local"
                  name="end_at"
                  value={formData.end_at}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-${COLORS.primary_500}`}
                />
              </div>
              {/* Allowed Attempts */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Allowed Attempts</label>
                <input
                  type="number"
                  name="allowed_attempts"
                  min="1"
                  value={formData.allowed_attempts}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-${COLORS.primary_500}`}
                />
              </div>
              {/* Resume Limit */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Resume Limit</label>
                <input
                  type="number"
                  name="resume_limit"
                  min="0"
                  value={formData.resume_limit}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-${COLORS.primary_500}`}
                />
              </div>
            </div>

            {/* Assignment Deadline (conditional) */}
            {formData.type === 'assignment' && (
              <div className="md:w-1/2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Assignment Deadline (optional)</label>
                <input
                  type="datetime-local"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-${COLORS.primary_500}`}
                />
              </div>
            )}
            {/* Is Practice */}
             <div className="flex items-center gap-3 pt-3">
              <input
                type="checkbox"
                name="is_practice"
                checked={formData.is_practice}
                onChange={handleChange}
                className={`w-5 h-5 text-${COLORS.primary_600} rounded focus:ring-${COLORS.primary_500}`}
              />
              <label className="text-sm font-medium text-gray-700">This is a **Practice** assessment (does not count towards final grade)</label>
            </div>
          </section>

          {/* === Result Release Options === */}
          <section className="space-y-5 border-b pb-8">
            <h3 className={`text-xl font-bold text-${COLORS.info_600} flex items-center gap-3`}>
              <Eye className={`w-6 h-6 text-${COLORS.info_500}`} />
              Result Release Settings
            </h3>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-${COLORS.info_50} rounded-xl`}>
              {/* Release Mode */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Clock className={`w-4 h-4 text-${COLORS.info_600}`} />
                  When to release results
                </label>
                {['now', 'at', 'after_submission'].map((mode) => (
                  <label key={mode} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="results_release_mode"
                      value={mode}
                      checked={formData.results_release_mode === mode}
                      onChange={handleChange}
                      className={`w-4 h-4 text-${COLORS.primary_600}`}
                    />
                    <span className="text-sm">
                      {mode === 'now' && 'Immediately (Now)'}
                      {mode === 'at' && 'At a specific date/time'}
                      {mode === 'after_submission' && "After learner's submission"}
                    </span>
                  </label>
                ))}
                {formData.results_release_mode === 'at' && (
                  <input
                    type="datetime-local"
                    name="results_release_at"
                    value={formData.results_release_at}
                    onChange={handleChange}
                    className={`ml-7 w-full max-w-xs px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-${COLORS.primary_500}`}
                  />
                )}
              </div>
              
              {/* What to Show */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Trophy className={`w-4 h-4 text-${COLORS.info_600}`} />
                  What to show in results
                </label>
                {['mark', 'mark_analysis'].map((show) => (
                  <label key={show} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="results_show"
                      value={show}
                      checked={formData.results_show === show}
                      disabled={show === 'mark_analysis' && formData.type !== 'mcq'}
                      onChange={handleChange}
                      className={`w-4 h-4 text-${COLORS.primary_600}`}
                    />
                    <span className={`text-sm ${show === 'mark_analysis' && formData.type !== 'mcq' ? 'text-gray-400' : ''}`}>
                      {show === 'mark' && 'Mark only'}
                      {show === 'mark_analysis' && `Mark & Detailed Analysis ${formData.type !== 'mcq' ? '(MCQ only)' : ''}`}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* === Type Specific Settings (MCQ / Coding) === */}
          <section className="space-y-5 border-b pb-8">
            <h3 className={`text-xl font-bold text-${COLORS.type_mcq}-700 flex items-center gap-3`}>
              <Shuffle className={`w-6 h-6 text-${COLORS.type_mcq}-500`} />
              Type Specific Settings
            </h3>
            
            {/* MCQ Settings */}
            {formData.type === 'mcq' && (
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-${COLORS.type_mcq}-50 rounded-xl`}>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="randomize_questions"
                      checked={formData.randomize_questions}
                      onChange={handleChange}
                      className={`w-5 h-5 text-${COLORS.primary_600} rounded`}
                    />
                    <span className="text-sm font-medium text-gray-700">Randomize question order</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="enable_negative_marking"
                      checked={formData.enable_negative_marking}
                      onChange={handleChange}
                      className={`w-5 h-5 text-${COLORS.primary_600} rounded`}
                    />
                    <span className="text-sm font-medium text-gray-700">Enable negative marking</span>
                  </label>
                </div>
                {formData.enable_negative_marking && (
                  <div className="self-start">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Negative Marks per Question</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      name="negative_marks_per_question"
                      value={formData.negative_marks_per_question}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-${COLORS.primary_500}`}
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* Coding Settings (Language Restriction - CHECKBOXES) */}
            {formData.type === 'coding' && (
              <div className={`p-5 bg-${COLORS.type_coding}-50 rounded-xl`}>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <Code className="inline w-4 h-4 mr-1 mb-0.5" />
                  Allowed Coding Languages (Select one or more)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {CODE_LANGUAGES.map(lang => (
                    <label 
                      key={lang.value} 
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        formData.allowed_languages.includes(lang.value)
                          ? `bg-${COLORS.type_coding}-100 border-${COLORS.type_coding}-400`
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.allowed_languages.includes(lang.value)}
                        onChange={(e) => handleLanguageCheckboxChange(lang.value, e.target.checked)}
                        className={`w-4 h-4 text-${COLORS.type_coding}-600 rounded focus:ring-${COLORS.type_coding}-500`}
                      />
                      <span className="text-sm font-medium text-gray-700">{lang.label}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-600">Students will only be able to submit solutions in the selected languages.</p>
              </div>
            )}
          </section>

          {/* === Proctoring/Security Features === */}
          <section className="space-y-5">
            <h3 className={`text-xl font-bold text-${COLORS.error_700} flex items-center gap-3`}>
              <Eye className={`w-6 h-6 text-${COLORS.error_50}`} />
              Proctoring & Security
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Disable Copy/Paste */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <label className="text-sm font-semibold text-gray-700">Disable Copy/Paste on Assessment Page</label>
                <input
                  type="checkbox"
                  name="disable_copy_paste"
                  checked={formData.disable_copy_paste}
                  onChange={handleChange}
                  className={`w-5 h-5 text-${COLORS.error_600} rounded focus:ring-${COLORS.error_50}`}
                />
              </div>
              {/* Tab Switch Limit */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tab Switch Limit (0 for Unlimited)</label>
                <input
                  type="number"
                  name="tab_switch_limit"
                  min="0"
                  placeholder="Unlimited"
                  value={formData.tab_switch_limit ?? ''}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-${COLORS.error_50}`}
                />
                <p className="mt-1 text-xs text-gray-500">Number of times a student can switch tabs away from the assessment page.</p>
              </div>
            </div>
          </section>

          {/* === Footer === */}
          <div className="flex gap-4 pt-6 sticky bottom-0 bg-white py-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-5 py-3 bg-${COLORS.primary_600} text-white rounded-xl hover:bg-${COLORS.primary_700} transition font-semibold shadow-lg shadow-${COLORS.primary}-200/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : assessment ? (
                'Update Assessment'
              ) : (
                'Create Assessment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}