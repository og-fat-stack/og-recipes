#!/usr/bin/env node
// token-audit — fails when UI code bypasses the design-token layer.
//
// Adapted for this Tailwind v4 codebase: styling lives as utility classes in
// TSX, so "hardcoded values" are raw palette utilities (bg-zinc-100,
// text-emerald-600), color dark:-variants (theming belongs in app/tokens.css),
// off-system radii, hex/rgb/hsl literals, arbitrary values and inline styles.
//
// Run:  node scripts/token-audit.mjs          (exit 1 = errors found)
//       node scripts/token-audit.mjs --strict (warnings also fail)
//
// Semantic tokens: app/tokens.css · lookup: stories/tokens/TokenReference.mdx

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const CONFIG = {
  root: process.cwd(),
  scanDirs: ['app', 'components', 'lib'],
  include: ['.tsx', '.ts', '.css'],
  exempt: ['app/tokens.css', 'app/globals.css'],
  ignoreDirs: ['node_modules', '.git', '.next'],
  strict: process.argv.includes('--strict'),
};

const PREFIXES = 'bg|text|border|divide|ring|outline|placeholder|accent|caret|fill|stroke|decoration|from|via|to';
const FAMILIES = 'zinc|gray|slate|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const VARIANTS = '(?:(?:hover|focus|focus-visible|active|disabled|dark|sm|md|lg|xl|group-hover):)*';

// Raw utility → semantic suggestion. Anything unmapped: consult the reference.
// Keyed for slate/teal (current palette) plus zinc/emerald legacy aliases.
const NEUTRAL_SUGGEST = (fam) => ({
  [`bg-${fam}-50`]: 'bg-surface-page / hover:bg-surface-hover (Zeilen-Hover)',
  [`bg-${fam}-100`]: 'bg-surface-subtle',
  [`bg-${fam}-200`]: 'bg-surface-inset',
  [`bg-${fam}-300`]: 'bg-surface-inset',
  [`bg-${fam}-700`]: 'bg-contrast-hover',
  [`bg-${fam}-800`]: 'bg-contrast-hover',
  [`bg-${fam}-900`]: 'bg-contrast',
  [`bg-${fam}-950`]: 'bg-surface-page',
  [`text-${fam}-900`]: 'text-ink',
  [`text-${fam}-700`]: 'text-ink-muted',
  [`text-${fam}-600`]: 'text-ink-muted',
  [`text-${fam}-500`]: 'text-ink-subtle',
  [`text-${fam}-400`]: 'text-ink-subtle',
  [`border-${fam}-100`]: 'border-line',
  [`border-${fam}-200`]: 'border-line',
  [`border-${fam}-300`]: 'border-line-strong',
  [`border-${fam}-400`]: 'border-line-active',
  [`border-${fam}-500`]: 'border-line-active',
  [`divide-${fam}-200`]: 'divide-line',
});
const ACCENT_SUGGEST = (fam) => ({
  [`bg-${fam}-500`]: 'bg-accent',
  [`bg-${fam}-600`]: 'bg-accent',
  [`bg-${fam}-700`]: 'bg-accent-hover',
  [`bg-${fam}-100`]: 'bg-accent-surface',
  [`text-${fam}-600`]: 'text-accent-ink',
  [`text-${fam}-800`]: 'text-accent-surface-ink',
  [`accent-${fam}-600`]: 'accent-accent',
});
const SUGGEST = {
  ...NEUTRAL_SUGGEST('slate'),
  ...NEUTRAL_SUGGEST('zinc'),
  ...ACCENT_SUGGEST('teal'),
  ...ACCENT_SUGGEST('emerald'),
  'bg-white': 'bg-surface',
  'bg-black': 'bg-contrast',
  'text-white': 'text-on-contrast / text-on-accent',
  'text-black': 'text-ink',
  'bg-amber-500': 'bg-warn',
  'bg-amber-600': 'bg-warn',
  'bg-amber-50': 'bg-warn-surface',
  'bg-amber-100': 'bg-warn-surface',
  'text-amber-600': 'text-warn-ink',
  'text-amber-800': 'text-warn-surface-ink',
  'text-amber-900': 'text-warn-surface-ink',
  'border-amber-200': 'border-warn-line',
  'border-amber-300': 'border-warn-line',
  'border-amber-400': 'border-warn-line',
  'text-red-600': 'text-danger-ink',
  'text-red-700': 'text-danger-surface-ink',
  'text-red-800': 'text-danger-surface-ink',
  'bg-red-50': 'bg-danger-surface',
  'bg-red-100': 'bg-danger-surface',
  'border-red-300': 'border-danger-line',
  'bg-sky-50': 'border-line bg-surface-subtle text-ink-muted (neutrale Notice)',
  'text-sky-900': 'text-ink-muted (neutrale Notice)',
  'border-sky-200': 'border-line (neutrale Notice)',
  'rounded-md': 'rounded-control',
  'rounded-xl': 'rounded-card',
  'rounded-lg': 'rounded-card oder rounded-control',
  'rounded-sm': 'rounded-control',
  'rounded': 'rounded-control',
};

function suggest(match) {
  const variants = (match.match(/^(?:[\w-]+:)+/) || [''])[0];
  const base = match.slice(variants.length);
  if (variants.includes('dark:'))
    return 'streichen — Dark Mode löst der Token-Layer (app/tokens.css)';
  const s = SUGGEST[base];
  if (!s) return 'semantisches Token — siehe stories/tokens/TokenReference.mdx';
  return s.includes(' ') ? s : variants + s;
}

// error: true blocks; error: false warns (or blocks with --strict).
const DETECTORS = [
  {
    name: 'raw palette utility',
    error: true,
    re: new RegExp(`(?<![\\w-])${VARIANTS}(?:${PREFIXES})-(?:(?:${FAMILIES})-\\d{2,3}(?:/\\d{1,3})?|white|black)(?![\\w-])`, 'g'),
  },
  {
    name: 'dark: color variant on semantic token',
    error: true,
    re: new RegExp(`(?<![\\w-])(?:[\\w-]+:)*dark:(?:[\\w-]+:)*(?:${PREFIXES})-[\\w/]+(?![\\w-])`, 'g'),
  },
  {
    name: 'off-system radius',
    error: true,
    re: /(?<![\w-])(?:[\w-]+:)*rounded-(?:xs|sm|md|lg|xl|2xl|3xl)(?![\w-])/g,
  },
  {
    // bare `rounded` is also the English word — only flag it inside class strings
    name: 'off-system radius (bare)',
    error: true,
    re: /(?<=["'`][^"'`\n]*)(?<![\w-])rounded(?![\w-])(?=[^"'`\n]*["'`])/g,
  },
  {
    name: 'raw color literal',
    error: true,
    re: /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)|\boklch\([^)]*\)/g,
  },
  {
    name: 'arbitrary value',
    error: false,
    re: /(?<![\w-])(?:[\w-]+:)*[\w-]+-\[[^\]]+\]/g,
  },
  {
    name: 'inline style',
    error: false,
    re: /style=\{\{/g,
  },
  {
    name: 'explicit duration/easing',
    error: false,
    re: /(?<![\w-])(?:[\w-]+:)*(?:duration|ease)-[\w[\]]+/g,
  },
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (CONFIG.ignoreDirs.includes(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (CONFIG.include.some((ext) => full.endsWith(ext))) out.push(full);
  }
  return out;
}

const lineOf = (text, i) => text.slice(0, i).split('\n').length;

function runAudit() {
  const files = CONFIG.scanDirs
    .flatMap((d) => walk(join(CONFIG.root, d)))
    .filter((f) => !CONFIG.exempt.includes(relative(CONFIG.root, f)));

  let errors = 0, warnings = 0, filesWithHits = 0;

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const hits = [];
    const seenAt = new Set(); // avoid double-reporting overlapping detectors
    for (const det of DETECTORS) {
      det.re.lastIndex = 0;
      let m;
      while ((m = det.re.exec(text))) {
        const key = `${m.index}:${m[0]}`;
        if (seenAt.has(key)) continue;
        seenAt.add(key);
        const isError = det.error || CONFIG.strict;
        hits.push({
          line: lineOf(text, m.index),
          match: m[0].slice(0, 60),
          note: det.error ? suggest(m[0]) : det.name,
          isError,
        });
        if (isError) errors++;
        else warnings++;
      }
    }
    if (hits.length) {
      filesWithHits++;
      console.log(relative(CONFIG.root, file));
      for (const h of hits.sort((a, b) => a.line - b.line)) {
        console.log(`  ${h.isError ? 'x' : '!'} L${h.line}: ${h.match} — ${h.note}`);
      }
      console.log('');
    }
  }

  console.log(
    `${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'} in ${filesWithHits} file${filesWithHits === 1 ? '' : 's'}`
  );
  return errors;
}

if (!process.argv.includes('--watch')) {
  process.exit(runAudit() > 0 ? 1 : 0);
}

// --watch: rerun on changes in the scanned dirs (used by `npm run storybook`).
const { watch } = await import('node:fs');
let timer = null;
const rerun = (trigger) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log(`\n[token-audit] ${trigger} changed — rescanning…`);
    runAudit();
  }, 250);
};
for (const dir of CONFIG.scanDirs) {
  watch(join(CONFIG.root, dir), { recursive: true }, (_event, filename) => {
    if (filename && CONFIG.include.some((ext) => filename.endsWith(ext))) rerun(filename);
  });
}
console.log(`[token-audit] watching ${CONFIG.scanDirs.join(', ')} …`);
runAudit();
