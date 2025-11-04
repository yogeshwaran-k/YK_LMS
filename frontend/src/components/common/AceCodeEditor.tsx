import { useEffect, useMemo } from 'react';
import AceEditor from 'react-ace';

// Import required modes and theme
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-c_cpp';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/theme-monokai';

interface AceCodeEditorProps {
  value: string;
  onChange: (code: string) => void;
  language: 'javascript' | 'typescript' | 'python' | 'c' | 'cpp' | 'java';
  onSave?: () => void;
  height?: string;
}

export default function AceCodeEditor({
  value,
  onChange,
  language,
  onSave,
  height = '320px',
}: AceCodeEditorProps) {
  // Determine the mode for Ace
  const mode = useMemo(() => {
    if (language === 'javascript' || language === 'typescript') return 'javascript';
    if (language === 'python') return 'python';
    if (language === 'java') return 'java';
    return 'c_cpp';
  }, [language]);

  // Keyboard shortcut for save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSave?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSave]);

  return (
    <AceEditor
      mode={mode}
      theme="monokai"
      width="100%"
      height={height}
      fontSize={14}
      value={value}
      onChange={(v: string) => onChange(v)}
      setOptions={{
        useWorker: false,
        showPrintMargin: false,
        tabSize: 2,
      }}
      editorProps={{ $blockScrolling: Infinity }}
    />
  );
}
