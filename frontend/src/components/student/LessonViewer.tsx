// src/components/LessonViewer.tsx
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Download, StickyNote, Pencil } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  content_type: 'text' | 'video' | 'pdf' | 'ppt' | 'coding';
  min_time_minutes: number;
  content_url?: string | null;
  content_text?: string | null;
}

interface LessonViewerProps {
  lesson: Lesson;
  onNext: () => void;
  onPrev: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onClose: () => void;
}

/* ── Visibility Hook: Timer only when tab is active ── */
function useVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  useEffect(() => {
    const handler = () => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);
  return isVisible;
}

export default function LessonViewer({
  lesson,
  onNext,
  onPrev,
  hasPrev,
  hasNext,
  onClose,
}: LessonViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [secondsSpent, setSecondsSpent] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'text' | 'whiteboard'>('text');

  const isTabActive = useVisibility();
  const minSeconds = lesson.min_time_minutes * 60;
  const progress = minSeconds > 0 ? Math.min((secondsSpent / minSeconds) * 100, 100) : 100;

  /* ── Timer: Only counts when tab is visible ── */
  useEffect(() => {
    if (!isTabActive) return;
    const start = Date.now() - secondsSpent * 1000;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setSecondsSpent(elapsed);
      if (elapsed >= minSeconds && !isCompleted) {
        setIsCompleted(true);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isTabActive, minSeconds, isCompleted, secondsSpent]);

  /* ── Whiteboard Drawing ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeTab !== 'whiteboard') return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let drawing = false;
    let lastX = 0, lastY = 0;

    const draw = (e: MouseEvent) => {
      if (!drawing) return;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
      [lastX, lastY] = [e.offsetX, e.offsetY];
    };

    const start = (e: MouseEvent) => {
      drawing = true;
      [lastX, lastY] = [e.offsetX, e.offsetY];
    };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', () => drawing = false);
    canvas.addEventListener('mouseout', () => drawing = false);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', draw);
    };
  }, [activeTab]);

  /* ── SECURE IFRAME CONTENT (PDF SCROLLABLE) ── */
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${lesson.title}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          html, body { 
            height:100%; width:100%; 
            overflow:auto !important; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; 
            background:#f9fafb; 
          }
          .container { padding:1.5rem; max-width:100%; margin:auto; }
          pre { white-space:pre-wrap; word-break:break-word; font-size:1rem; line-height:1.6; color:#1f2937; }
          iframe, embed, object { 
            width:100%; height:100vh; border:none; display:block; 
          }
          /* PDF SCROLL FIX */
          body.pdf-mode, body.pdf-mode * { pointer-events: auto !important; }
          /* HIDE GOOGLE DRIVE UI */
          .ndfHFb, .drive-viewer-toolstrip, [aria-label*="Download"], 
          button[title="Download"], .drive-viewer-video-current-time,
          .drive-viewer-presentation-slide-number { display:none !important; }
          * { user-select:none !important; -webkit-user-select:none !important; }
        </style>
      </head>
      <body class="${lesson.content_type === 'pdf' ? 'pdf-mode' : ''}">
        <div class="container">
    `);

    if (lesson.content_type === 'text' && lesson.content_text) {
      const safe = lesson.content_text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      doc.write(`<pre>${safe}</pre>`);
    } else if (lesson.content_url) {
      // Google Drive PDF → /preview (scrollable)
      if (lesson.content_type === 'pdf' && lesson.content_url.includes('drive.google.com')) {
        const fileId = lesson.content_url.match(/\/file\/d\/([^/]+)/)?.[1];
        if (fileId) {
          doc.write(`
            <iframe src="https://drive.google.com/file/d/${fileId}/preview" 
                    frameborder="0" 
                    style="width:100%;height:100vh;"
                    sandbox="allow-scripts allow-same-origin allow-modals">
            </iframe>
          `);
        }
      } 
      // AWS S3 / Direct URL
      else {
        doc.write(`
          <iframe src="${lesson.content_url}" 
                  frameborder="0" 
                  style="width:100%;height:100vh;"
                  sandbox="allow-scripts allow-same-origin allow-modals">
          </iframe>
        `);
      }
    } else {
      doc.write('<p>No content available.</p>');
    }

    doc.write(`
        </div>
        <script>
          // Block interaction
          document.oncontextmenu = () => false;
          document.onselectstart = () => false;
          document.onkeydown = e => {
            if (e.ctrlKey || e.metaKey || ['F12', 'c', 's', 'a', 'p'].includes(e.key)) {
              e.preventDefault();
            }
          };
          // Remove any download UI that appears
          setInterval(() => {
            document.querySelectorAll('[aria-label*="Download"], button[title="Download"], .ndfHFb, .drive-viewer-toolstrip').forEach(el => el.remove());
          }, 200);
        </script>
      </body>
      </html>
    `);
    doc.close();
  }, [lesson]);

  /* ── Download Notes ── */
  const downloadNotes = () => {
    if (activeTab === 'text') {
      const blob = new Blob([notes], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${lesson.title.replace(/[^a-z0-9]/gi, '_')}_notes.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      canvasRef.current?.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${lesson.title.replace(/[^a-z0-9]/gi, '_')}_whiteboard.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col z-50 font-sans">
      {/* Coursera-style Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 disabled:text-gray-400 text-sm font-medium"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>
            <h1 className="text-lg font-semibold text-gray-900 truncate max-w-md">
              {lesson.title}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="font-mono">
                {String(Math.floor(secondsSpent / 60)).padStart(2, '0')}:
                {String(secondsSpent % 60).padStart(2, '0')}
              </span>
              {minSeconds > 0 && (
                <span className="text-gray-500 text-xs">/ {lesson.min_time_minutes} min</span>
              )}
            </div>

            {minSeconds > 0 && (
              <div className="w-48 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${isCompleted ? 'bg-emerald-500' : 'bg-blue-600'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNext}
              disabled={!hasNext || !isCompleted}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 disabled:text-gray-400 text-sm font-medium"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="p-2 rounded-lg hover:bg-gray-100 transition"
              title="Notes"
            >
              <StickyNote className="w-5 h-5 text-gray-700" />
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-sm">
              Close
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 ${showNotes ? 'w-7/12' : 'w-full'} transition-all duration-300`}>
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title={lesson.title}
            sandbox="allow-scripts allow-same-origin allow-modals"
            allowFullScreen
          />
        </div>

        {/* Notes Panel */}
        {showNotes && (
          <div className="w-5/12 bg-white border-l border-gray-200 flex flex-col">
            <div className="border-b p-4 flex items-center justify-between">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('text')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    activeTab === 'text' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Text
                </button>
                <button
                  onClick={() => setActiveTab('whiteboard')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    activeTab === 'whiteboard' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Pencil className="w-4 h-4 inline mr-1" />
                  Draw
                </button>
              </div>
              <button
                onClick={downloadNotes}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
                title="Download"
              >
                <Download className="w-4 h-4 text-gray-700" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-auto">
              {activeTab === 'text' ? (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Your notes..."
                  className="w-full h-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ minHeight: '300px' }}
                />
              ) : (
                <canvas
                  ref={canvasRef}
                  className="w-full h-full border rounded-lg bg-white cursor-crosshair"
                  style={{ minHeight: '400px' }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}