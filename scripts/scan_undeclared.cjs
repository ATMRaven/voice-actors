// Static scan: find identifiers referenced in static/app.js that are never declared.
// Catches the class of bug where an undeclared variable throws mid-setup-function and
// silently kills every handler registered after it.
const fs = require('fs');
const src = fs.readFileSync('static/app.js', 'utf8');

const declared = new Set();
for (const m of src.matchAll(/(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)) declared.add(m[1]);
for (const m of src.matchAll(/([A-Za-z_$][\w$]*)\s*:/g)) declared.add(m[1]);          // object keys / labels
for (const m of src.matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)) declared.add(m[1]);        // called names
for (const m of src.matchAll(/\.\s*([A-Za-z_$][\w$]*)/g)) declared.add(m[1]);        // properties

const builtins = new Set(`window document localStorage console fetch setTimeout clearTimeout setInterval
clearInterval performance URL Audio AudioContext AbortController Blob Uint8Array Array Object JSON Math Date
String Number Boolean Promise Error TypeError Set Map navigator location history requestAnimationFrame
cancelAnimationFrame getComputedStyle FormData URLSearchParams encodeURIComponent decodeURIComponent
parseFloat parseInt isNaN MediaRecorder FileReader CustomEvent MouseEvent KeyboardEvent Event Response Request
Headers File Image WebSocket Worker crypto caches Notification TextEncoder TextDecoder RegExp Intl queueMicrotask
reportError btoa atob`.split(/\s+/));

const keywords = new Set(`if for while return const let var function new typeof instanceof delete void in of do
else switch case break continue default try catch finally throw async await yield class extends super this true
false null undefined NaN Infinity get set static import export from as`.split(/\s+/));

const hits = new Map();
const lines = src.split('\n');
lines.forEach((line, idx) => {
  // strip line comments, then all string/template literals
  const noComment = line.replace(/\/\/.*$/, '');
  const stripped = noComment
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');

  for (const m of stripped.matchAll(/(?<![.\w$])([a-zA-Z_$][\w$]*)/g)) {
    const id = m[1];
    if (declared.has(id) || builtins.has(id) || keywords.has(id)) continue;
    if (id.startsWith('__')) continue;
    if (!hits.has(id)) hits.set(id, []);
    hits.get(id).push(idx + 1);
  }
});

const rows = [...hits.entries()]
  .map(([id, ls]) => ({ id, count: ls.length, lines: ls.slice(0, 6).join(',') }))
  .sort((a, b) => b.count - a.count);

console.log(`undeclared identifier candidates: ${rows.length}`);
console.log('--- all ---');
for (const r of rows) console.log(`${r.count.toString().padStart(3)}x  ${r.id.padEnd(28)} lines: ${r.lines}`);
