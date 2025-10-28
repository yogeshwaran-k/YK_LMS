import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { Play, Loader2 } from 'lucide-react';

interface CodeRunnerProps {
  title?: string;
  starterCode?: string;
}

const LANGUAGE_TEMPLATES: Record<string, string> = {
  javascript: `// Write your solution here
function solution(input) {
  // input is a string from stdin
  return input;
}

const fs = require('fs');
const input = fs.readFileSync(0, 'utf8');
const out = solution(input);
if (typeof out !== 'undefined') process.stdout.write(String(out));
`,
  python: `# Write your solution here
def solution(input: str):
    return input

import sys
input_data = sys.stdin.read()
out = solution(input_data)
if out is not None:
    sys.stdout.write(str(out))
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;
int main(){
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    string s, all; while (getline(cin, s)) { all += s + "\n"; }
    cout << all; // echo input
    return 0;
}
`,
  c: `#include <stdio.h>
int main(){
    int c; while((c=getchar())!=EOF) putchar(c);
    return 0;
}
`,
  java: `import java.io.*; import java.util.*;
public class Main{
  public static void main(String[] args) throws Exception{
    String all = new String(System.in.readAllBytes());
    System.out.print(all); // echo input
  }
}
`,
  typescript: `// deno compatible ts not guaranteed in runner; prefer javascript.
console.log(await new Response(Deno.stdin.readable).text());
`,
};

export default function CodeRunner({ title = 'Online Compiler', starterCode }: CodeRunnerProps) {
  const [language, setLanguage] = useState<string>('javascript');
  const [code, setCode] = useState<string>('');
  const [stdin, setStdin] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [meta, setMeta] = useState<{ time?: number | string | null; memory?: number | null; exitCode?: number | null } | null>(null);

  useEffect(() => {
    const tpl = LANGUAGE_TEMPLATES[language] || '';
    setCode(starterCode && language === 'javascript' ? starterCode : tpl);
  }, [language, starterCode]);

  async function run() {
    setLoading(true);
    setStdout('');
    setStderr('');
    setMeta(null);
    try {
      const res = await api.post<{ stdout: string; stderr: string; exitCode: number | null; time?: number | string | null; memory?: number | null }>(
        '/runner/execute',
        { language, code, stdin }
      );
      setStdout(res.stdout || '');
      setStderr(res.stderr || '');
      setMeta({ time: res.time ?? null, memory: res.memory ?? null, exitCode: res.exitCode ?? null });
    } catch (e: any) {
      setStderr(e.message || 'Execution failed');
    } finally {
      setLoading(false);
    }
  }

  const langs = useMemo(() => Object.keys(LANGUAGE_TEMPLATES), []);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded"
          >
            {langs.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <button
            onClick={run}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
          <textarea
            rows={16}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Standard Input (stdin)</label>
          <textarea
            rows={6}
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm mb-4"
            placeholder="Provide input for your program here"
          />
          <div className="space-y-3">
            <div>
              <span className="block text-xs font-semibold text-gray-700 mb-1">Stdout</span>
              <pre className="bg-gray-50 p-3 rounded border text-sm whitespace-pre-wrap">{stdout || '—'}</pre>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-700 mb-1">Stderr</span>
              <pre className="bg-gray-50 p-3 rounded border text-sm whitespace-pre-wrap text-red-700">{stderr || '—'}</pre>
            </div>
            {meta && (
              <div className="text-xs text-gray-500">
                <span className="mr-3">exit: {meta.exitCode ?? 'n/a'}</span>
                <span className="mr-3">time: {String(meta.time ?? 'n/a')}</span>
                <span>mem: {meta.memory ?? 'n/a'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}