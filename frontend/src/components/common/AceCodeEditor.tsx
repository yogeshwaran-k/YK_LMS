import { useEffect, useMemo, useState } from 'react';
import SimpleEditor from './SimpleCodeEditor';

interface AceCodeEditorProps {
  value: string;
  onChange: (code: string) => void;
  language: 'javascript'|'typescript'|'python'|'c'|'cpp'|'java';
  onSave?: () => void;
  height?: string;
}

export default function AceCodeEditor({ value, onChange, language, onSave, height = '320px' }: AceCodeEditorProps) {
  const mode = useMemo(() => {
    if (language === 'javascript' || language === 'typescript') return 'javascript';
    if (language === 'python') return 'python';
    if (language === 'java') return 'java';
    return 'c_cpp';
  }, [language]);

  const [AceComp, setAceComp] = useState<any>(null);

  useEffect(() => {
    const enabled = typeof window !== 'undefined' && (window as any).__ACE_ENABLED === true;
    if (!enabled) return;
    (async () => {
      try {
        const acePkg = 'react' + '-ace';
        const mod = await import(/* @vite-ignore */ (acePkg as any));
        const base = 'ace-builds/src-noconflict/';
        await Promise.all([
          import(/* @vite-ignore */ (base + 'mode-javascript') as any),
          import(/* @vite-ignore */ (base + 'mode-python') as any),
          import(/* @vite-ignore */ (base + 'mode-c_cpp') as any),
          import(/* @vite-ignore */ (base + 'mode-java') as any),
          import(/* @vite-ignore */ (base + 'theme-monokai') as any),
        ]);
        setAceComp((mod as any).default || (mod as any));
      } catch {
        setAceComp(null);
      }
    })();
  }, []);

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

  if (!AceComp) {
    return <SimpleEditor value={value} onChange={onChange} placeholder="Write code here..." onSave={onSave} />;
  }

  const AceEditor = AceComp;
  return (
    <AceEditor
      mode={mode}
      theme="monokai"
      width="100%"
      height={height}
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
