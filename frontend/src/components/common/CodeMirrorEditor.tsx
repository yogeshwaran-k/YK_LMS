import { useEffect, useState } from 'react';
import SimpleEditor from './SimpleCodeEditor';

type Lang = 'javascript'|'typescript'|'python'|'c'|'cpp'|'java';

export default function CodeMirrorEditor({ value, onChange, language, onSave, height = '320px' }: { value: string; onChange:(v:string)=>void; language: Lang; onSave?: ()=>void; height?: string; }) {
  const [Cm, setCm] = useState<any>(null);
  const [langMod, setLangMod] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const cmPkg = '@uiw/' + 'react-codemirror';
        const mod = await import(/* @vite-ignore */ (cmPkg as any));
        setCm((mod as any).default || (mod as any));
      } catch {
        setCm(null);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const base = '@codemirror/';
        if (language === 'javascript' || language === 'typescript') {
          const mod = await import(/* @vite-ignore */ (base + 'lang-javascript') as any);
          setLangMod(mod.javascript);
        } else if (language === 'python') {
          const mod = await import(/* @vite-ignore */ (base + 'lang-python') as any);
          setLangMod(mod.python);
        } else if (language === 'java') {
          const mod = await import(/* @vite-ignore */ (base + 'lang-java') as any);
          setLangMod(mod.java);
        } else {
          const mod = await import(/* @vite-ignore */ (base + 'lang-cpp') as any);
          setLangMod(mod.cpp);
        }
      } catch {
        setLangMod(null);
      }
    })();
  }, [language]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); onSave?.(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSave]);

  if (!Cm) return <SimpleEditor value={value} onChange={onChange} placeholder="Write code here..." onSave={onSave} />;

  const extensions = langMod ? [langMod()] : [];
  const Editor = Cm;
  return (
    <div style={{ height }}>
      <Editor
        value={value}
        onChange={(v:string)=>onChange(v)}
        height={height}
        basicSetup={{ lineNumbers: true }}
        theme={'dark'}
        extensions={extensions}
      />
    </div>
  );
}