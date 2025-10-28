import { useMemo, useRef } from 'react';

interface SimpleCodeEditorProps {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  onSave?: () => void;
}

function highlight(code: string) {
  // very basic JS/TS/C-like highlighting
  const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  let out = esc(code);
  out = out.replace(/(\/\*[\s\S]*?\*\/|\/\/.*$)/gm, '<span class="tok-com">$1</span>');
  out = out.replace(/("[^"]*"|'[^']*')/g, '<span class="tok-str">$1</span>');
  out = out.replace(/\b(const|let|var|function|return|if|else|for|while|switch|case|break|class|new|try|catch|throw|import|from|export|extends|implements|interface|public|private|protected|static|void|int|float|double|char|bool|boolean|null|undefined|true|false)\b/g, '<span class="tok-kw">$1</span>');
  out = out.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
  return out;
}

export default function SimpleCodeEditor({ value, onChange, placeholder, onSave }: SimpleCodeEditorProps) {
  const lines = useMemo(() => Math.max(1, value.split('\n').length), [value]);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      onSave?.();
    }
  }

  return (
    <div className="rounded-lg overflow-hidden border border-gray-300 bg-[#0f172a]">
      <div className="flex text-xs items-center justify-between px-3 py-2 bg-[#0b1220] text-gray-300 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="w-2 h-2 rounded-full bg-green-500" />
        </div>
        <div className="text-[11px] tracking-wider uppercase text-gray-400">Editor</div>
        <div />
      </div>
      <div className="relative flex">
        <pre className="select-none px-3 py-3 text-right text-xs leading-6 text-gray-500 bg-[#0b1220] border-r border-gray-700 min-w-[3rem]">
          {Array.from({ length: lines }, (_, i) => i + 1).join('\n')}
        </pre>
        <pre aria-hidden className="absolute inset-0 left-[3rem] right-0 px-3 py-3 overflow-auto whitespace-pre-wrap font-mono text-sm leading-6 text-[#e2e8f0]">
          <code dangerouslySetInnerHTML={{ __html: highlight(value) }} />
        </pre>
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          placeholder={placeholder}
          className="w-full resize-y min-h-[220px] px-3 py-3 bg-transparent text-transparent caret-white font-mono text-sm leading-6 outline-none relative"
          style={{ WebkitTextFillColor: 'transparent' }}
        />
      </div>
      <style>{`.tok-kw{color:#93c5fd}.tok-num{color:#fca5a5}.tok-str{color:#86efac}.tok-com{color:#9ca3af}`}</style>
    </div>
  );
}
