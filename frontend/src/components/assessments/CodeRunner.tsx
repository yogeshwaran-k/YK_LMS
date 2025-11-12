import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import {
  Play,
  Loader2,
  Copy,
  CheckCircle,
  AlertCircle,
  Terminal,
  Clock,
  HardDrive,
  FileCode,
  ChevronDown,
} from 'lucide-react';
import AceCodeEditor from '../common/AceCodeEditor';

interface CodeRunnerProps {
  title?: string;
  starterCode?: string;
  language?: string;
  height?: string;
  showInput?: boolean;
  showOutput?: boolean;
  showMeta?: boolean;
}

const LANGUAGE_TEMPLATES: Record<string, { code: string; mode: string; name: string }> = {
  javascript: {
    code: `// Write your solution here\nfunction solution(input) {\n  return input;\n}\n\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim();\nconst out = solution(input);\nif (typeof out !== 'undefined') process.stdout.write(String(out));\n`,
    mode: 'javascript',
    name: 'JavaScript',
  },
  python: {
    code: `# Write your solution here\ndef solution(input: str):\n    return input\n\nimport sys\ninput_data = sys.stdin.read().strip()\nout = solution(input_data)\nif out is not None:\n    sys.stdout.write(str(out))\n`,
    mode: 'python',
    name: 'Python',
  },
  cpp: {
    code: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    string s, all;\n    while (getline(cin, s)) all += s + "\\n";\n    cout << all;\n    return 0;\n}\n`,
    mode: 'c_cpp',
    name: 'C++',
  },
  c: {
    code: `#include <stdio.h>\nint main() {\n    int c;\n    while ((c = getchar()) != EOF) putchar(c);\n    return 0;\n}\n`,
    mode: 'c_cpp',
    name: 'C',
  },
  java: {
    code: `import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        String all = new String(System.in.readAllBytes());\n        System.out.print(all);\n    }\n}\n`,
    mode: 'java',
    name: 'Java',
  },
  typescript: {
    code: `// Deno-compatible TS\nawait new Response(Deno.stdin.readable).text().then(text => console.log(text));\n`,
    mode: 'typescript',
    name: 'TypeScript',
  },
};

export default function CodeRunner({
  title = 'Online Compiler',
  starterCode,
  language: initialLanguage = 'javascript',
  height = '320px',
  showInput = true,
  showOutput = true,
  showMeta = true,
}: CodeRunnerProps) {
  const [language, setLanguage] = useState(initialLanguage);
  const [code, setCode] = useState('');
  const [stdin, setStdin] = useState('');
  const [loading, setLoading] = useState(false);
  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [meta, setMeta] = useState<{
    time?: number | string | null;
    memory?: number | null;
    exitCode?: number | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const langs = useMemo(() => Object.keys(LANGUAGE_TEMPLATES), []);

  useEffect(() => {
    const tpl = LANGUAGE_TEMPLATES[language]?.code || '';
    setCode(starterCode && language === initialLanguage ? starterCode : tpl);
  }, [language, starterCode, initialLanguage]);

  const run = async () => {
    setLoading(true);
    setStdout('');
    setStderr('');
    setMeta(null);
    try {
      const res = await api.post<{
        stdout: string;
        stderr: string;
        exitCode: number | null;
        time?: number | string | null;
        memory?: number | null;
      }>('/runner/execute', { language, code, stdin });
      setStdout(res.stdout || '');
      setStderr(res.stderr || '');
      setMeta({ time: res.time ?? null, memory: res.memory ?? null, exitCode: res.exitCode ?? null });
    } catch (e: any) {
      setStderr(e.message || 'Execution failed');
    } finally {
      setLoading(false);
    }
  };

  const copyOutput = () => {
    const text = stdout || stderr || '';
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentLang = LANGUAGE_TEMPLATES[language];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-300 text-sm rounded-lg pl-3 pr-8 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {langs.map((l) => (
                <option key={l} value={l}>
                  {LANGUAGE_TEMPLATES[l].name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium text-sm hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Run
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Code Editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              Code
            </label>
            <span className="text-xs text-gray-500">{currentLang?.name || language}</span>
          </div>
          <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
            <AceCodeEditor
              value={code}
              onChange={setCode}
              language={(currentLang?.mode || 'javascript') as 'javascript' | 'typescript' | 'python' | 'c' | 'cpp' | 'java'}
              height={height}
            />
          </div>
        </div>

        {/* Input & Output */}
        <div className="space-y-5">
          {showInput && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Standard Input (stdin)
              </label>
              <textarea
                rows={4}
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Enter input data here..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
          )}

          {showOutput && (
            <>
              {/* Output */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    {stderr ? (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                    Output
                  </label>
                  {(stdout || stderr) && (
                    <button
                      onClick={copyOutput}
                      className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  )}
                </div>
                <pre
                  className={`p-3 rounded-lg border text-sm font-mono whitespace-pre-wrap break-all min-h-20 ${
                    stderr
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : stdout
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                >
                  {stdout || stderr || '—'}
                </pre>
              </div>

              {/* Meta */}
              {showMeta && meta && (
                <div className="flex items-center gap-4 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Time: {meta.time !== null ? `${meta.time}s` : '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5" />
                    Memory: {meta.memory !== null ? `${meta.memory}MB` : '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    Exit: {meta.exitCode ?? '—'}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}