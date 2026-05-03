// ============================================
// thumbnail-service.js
// Canvas-only thumbnail generator — no external APIs
// ============================================

// ── Tech accent colours ──────────────────────
const THUMB_ACCENT = {
  'C':          { color: '#8888ff', badge: '#2a2a6e' },
  'C++':        { color: '#f34b7d', badge: '#3a1020' },
  'C#':         { color: '#4ec94e', badge: '#0f2e0f' },
  'Unity':      { color: '#4ec94e', badge: '#0f2e0f' },
  'Python':     { color: '#3572A5', badge: '#0d1f35' },
  'JavaScript': { color: '#f1e05a', badge: '#2e2a0a' },
  'TypeScript': { color: '#3178c6', badge: '#0e1e3a' },
  'Java':       { color: '#f09820', badge: '#2e1e04' },
  'HTML':       { color: '#e34c26', badge: '#2e0e06' },
  'CSS':        { color: '#a78bfa', badge: '#1a0f35' },
  'Markdown':   { color: '#818cf8', badge: '#1a1a3e' },
  'SQL':        { color: '#00c8b0', badge: '#003830' },
  'default':    { color: '#6366f1', badge: '#1a1a3e' }
};

// ── Fake code snippets per language ──────────
const CODE_SNIPPETS = {
  'C': [
    '#include <stdio.h>',
    '',
    'int main() {',
    '  printf("Hello, World!\\n");',
    '  int arr[5] = {1,2,3,4,5};',
    '  for(int i=0; i<5; i++) {',
    '    printf("%d ", arr[i]);',
    '  }',
    '  return 0;',
    '}'
  ],
  'C++': [
    '#include <iostream>',
    '#include <vector>',
    'using namespace std;',
    '',
    'int main() {',
    '  vector<int> v = {1,2,3};',
    '  for(auto x : v)',
    '    cout << x << " ";',
    '  return 0;',
    '}'
  ],
  'C#': [
    'using System;',
    '',
    'class Program {',
    '  static void Main() {',
    '    Console.WriteLine("Hello!");',
    '    var list = new List<int>();',
    '    list.Add(42);',
    '    foreach(var n in list)',
    '      Console.Write(n);',
    '  }',
    '}'
  ],
  'Python': [
    'def greet(name: str) -> str:',
    '  return f"Hello, {name}!"',
    '',
    'data = [1, 2, 3, 4, 5]',
    'result = [x**2 for x in data',
    '          if x % 2 == 0]',
    '',
    'print(greet("World"))',
    'print(result)  # [4, 16]'
  ],
  'JavaScript': [
    'const fetchData = async (url) => {',
    '  const res = await fetch(url);',
    '  const json = await res.json();',
    '  return json.filter(Boolean);',
    '};',
    '',
    'document.addEventListener(',
    "  'DOMContentLoaded', async () => {",
    '  const data = await fetchData("/api");',
    '  renderCards(data);',
    '});'
  ],
  'TypeScript': [
    'interface Project {',
    '  id: string;',
    '  title: string;',
    '  tech: string[];',
    '}',
    '',
    'const render = (p: Project): void => {',
    '  const el = document.createElement("div");',
    '  el.textContent = p.title;',
    '  document.body.appendChild(el);',
    '};'
  ],
  'Java': [
    'import java.util.*;',
    '',
    'public class Main {',
    '  public static void main(String[] a) {',
    '    List<String> items =',
    '      Arrays.asList("A","B","C");',
    '    items.stream()',
    '      .filter(s -> !s.isEmpty())',
    '      .forEach(System.out::println);',
    '  }',
    '}'
  ],
  'default': [
    '// Portfolio Project',
    '',
    'const project = {',
    '  title: "My Project",',
    '  stack: ["HTML","CSS","JS"],',
    '  live:  true',
    '};',
    '',
    'function deploy(p) {',
    '  return `✅ ${p.title} live!`;',
    '}'
  ]
};

// ── Drawing helpers ───────────────────────────

/** Wrap text and return lines array */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Draw a rounded rectangle path */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Main generator ────────────────────────────

/**
 * Generate a canvas thumbnail for a project.
 * @param {Object} project  — { id, title, description, tech, tech_stack, language, thumbnail }
 * @returns {string}        — data:image/png base64 URL
 */
function generateThumbnail(project) {
  const W = 800, H = 400;
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Detect primary language
  const stack = project.tech || project.tech_stack || [];
  const lang  = project.language
    || (stack.length > 0 ? stack[0] : '')
    || '';
  const theme = THUMB_ACCENT[lang] || THUMB_ACCENT['default'];
  const accent = theme.color;
  const snippets = CODE_SNIPPETS[lang] || CODE_SNIPPETS['default'];

  // ── 1. Background ────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   '#0f0f23');
  bg.addColorStop(0.6, '#1a1a3e');
  bg.addColorStop(1,   '#0d0f13');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── 2. Subtle grid ───────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // ── 3. Glow orb ──────────────────────────────
  const glow = ctx.createRadialGradient(W * 0.75, H * 0.35, 0, W * 0.75, H * 0.35, 220);
  glow.addColorStop(0, accent + '28');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── 4. Code editor panel (left 58%) ──────────
  const panelX = 24, panelY = 18, panelW = W * 0.58, panelH = H - 90;

  // Panel bg
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, panelX, panelY, panelW, panelH, 10);
  ctx.fill();

  // Panel border
  ctx.strokeStyle = accent + '44';
  ctx.lineWidth = 1.2;
  roundRect(ctx, panelX, panelY, panelW, panelH, 10);
  ctx.stroke();

  // Title bar
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(panelX, panelY, panelW, 28);

  // Traffic-light dots
  const dots = [
    { x: panelX + 14, color: '#ff5f57' },
    { x: panelX + 30, color: '#ffbd2e' },
    { x: panelX + 46, color: '#28c840' }
  ];
  dots.forEach(d => {
    ctx.beginPath();
    ctx.arc(d.x, panelY + 14, 5, 0, Math.PI * 2);
    ctx.fillStyle = d.color;
    ctx.fill();
  });

  // File name label
  ctx.font = '11px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText(`main.${getExt(lang)}`, panelX + 68, panelY + 18);

  // ── 5. Syntax-highlighted code ───────────────
  const codeX = panelX + 18;
  let  codeY = panelY + 52;
  const lineH = 17.5;

  ctx.font = '12px monospace';
  snippets.slice(0, 10).forEach((line, i) => {
    const tokens = tokenizeLine(line, lang);
    let drawX = codeX;

    // Line number
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillText(String(i + 1).padStart(2, ' '), panelX + 4, codeY);

    tokens.forEach(({ text, color }) => {
      ctx.fillStyle = color;
      ctx.fillText(text, drawX, codeY);
      drawX += ctx.measureText(text).width;
    });
    codeY += lineH;
  });

  // ── 6. Info panel (right) ────────────────────
  const infoX = panelX + panelW + 20;
  const infoW = W - infoX - 20;
  const infoY = panelY;

  // Decorative vertical accent line
  ctx.fillStyle = accent;
  ctx.fillRect(infoX - 10, infoY + 10, 2, panelH - 20);

  // Project name label
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.fillStyle = accent;
  ctx.fillText('PROJECT', infoX, infoY + 26);

  // Project title (wrapped)
  const title = (project.title || 'Project').replace(/-/g, ' ');
  ctx.font = 'bold 20px Outfit, Inter, sans-serif';
  ctx.fillStyle = '#f1f5f9';
  const titleLines = wrapText(ctx, title, infoW);
  let ty = infoY + 50;
  titleLines.slice(0, 3).forEach(ln => {
    ctx.fillText(ln, infoX, ty);
    ty += 26;
  });

  // Description (wrapped, muted)
  if (project.description) {
    ctx.font = '11.5px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    const desc = project.description.length > 90
      ? project.description.slice(0, 90) + '…'
      : project.description;
    const descLines = wrapText(ctx, desc, infoW);
    descLines.slice(0, 3).forEach(ln => {
      ctx.fillText(ln, infoX, ty);
      ty += 16;
    });
  }

  // Tech stack pills
  ty += 8;
  const pillTechs = stack.length > 0 ? stack.slice(0, 3) : (lang ? [lang] : ['Code']);
  pillTechs.forEach(tech => {
    const t = THUMB_ACCENT[tech] || theme;
    const pw = ctx.measureText(tech).width + 20;
    if (ty + 22 > panelY + panelH - 10) return;

    ctx.font = 'bold 11px Inter, sans-serif';
    roundRect(ctx, infoX, ty, pw, 22, 11);
    ctx.fillStyle = t.badge;
    ctx.fill();
    ctx.strokeStyle = t.color + '88';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = t.color;
    ctx.fillText(tech, infoX + 10, ty + 14.5);
    ty += 28;
  });

  // ── 7. Bottom bar ────────────────────────────
  const barY = H - 46;

  // Separator line
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, barY); ctx.lineTo(W, barY); ctx.stroke();

  // Bottom bg
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, barY, W, H - barY);

  // Status dot + label
  ctx.beginPath();
  ctx.arc(28, barY + 23, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#22c55e';
  ctx.fill();

  ctx.font = '12px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('github.com/thesiddharthagupta', 42, barY + 27);

  // Right: language badge
  const badge = lang || 'Code';
  ctx.font = 'bold 12px Inter, sans-serif';
  const bw = ctx.measureText(badge).width + 24;
  roundRect(ctx, W - bw - 20, barY + 10, bw, 26, 13);
  ctx.fillStyle = theme.badge;
  ctx.fill();
  ctx.strokeStyle = accent + '77';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.textAlign = 'center';
  ctx.fillText(badge, W - 20 - bw / 2, barY + 27);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}

// ── Syntax tokenizer ─────────────────────────
function tokenizeLine(line, lang) {
  if (!line.trim()) return [{ text: line, color: 'transparent' }];

  const tokens = [];
  let rest = line;

  // Comment
  if (rest.trimStart().startsWith('//') || rest.trimStart().startsWith('#')) {
    return [{ text: rest, color: '#6a7f6a' }];
  }

  // Simple tokenize: keywords, strings, numbers, rest
  const keywords = {
    'C':          /^(int|char|void|return|for|if|else|include|printf|main)\b/,
    'C++':        /^(int|auto|void|return|for|if|cout|using|namespace|std|vector|class)\b/,
    'C#':         /^(using|public|static|void|class|var|new|foreach|Console|int|string|List)\b/,
    'Python':     /^(def|return|for|if|else|in|print|import|from|class|True|False|None|and|or|not|lambda)\b/,
    'JavaScript': /^(const|let|var|function|return|async|await|if|else|for|of|=>|document|addEventListener)\b/,
    'TypeScript': /^(const|let|interface|void|return|string|number|boolean|export|import|type|readonly)\b/,
    'Java':       /^(public|static|void|class|return|import|new|List|Arrays|System|String|int)\b/,
    'default':    /^(const|let|function|return|if|else|true|false|null)\b/
  };
  const kwRe = keywords[lang] || keywords['default'];

  while (rest.length > 0) {
    // String
    const strMatch = rest.match(/^(".*?"|'.*?'|`.*?`)/);
    if (strMatch) {
      tokens.push({ text: strMatch[1], color: '#ce9178' });
      rest = rest.slice(strMatch[1].length);
      continue;
    }
    // Number
    const numMatch = rest.match(/^(\d+)/);
    if (numMatch) {
      tokens.push({ text: numMatch[1], color: '#b5cea8' });
      rest = rest.slice(numMatch[1].length);
      continue;
    }
    // Keyword
    const kwMatch = rest.match(kwRe);
    if (kwMatch) {
      tokens.push({ text: kwMatch[0], color: '#569cd6' });
      rest = rest.slice(kwMatch[0].length);
      continue;
    }
    // Punctuation / symbol
    const punctMatch = rest.match(/^([{}()\[\];:,.<>!|&+\-*/=])/);
    if (punctMatch) {
      tokens.push({ text: punctMatch[1], color: '#d4d4d4' });
      rest = rest.slice(1);
      continue;
    }
    // Word (identifier / other)
    const wordMatch = rest.match(/^(\w+)/);
    if (wordMatch) {
      tokens.push({ text: wordMatch[1], color: '#9cdcfe' });
      rest = rest.slice(wordMatch[1].length);
      continue;
    }
    // Whitespace / other
    tokens.push({ text: rest[0], color: '#d4d4d4' });
    rest = rest.slice(1);
  }
  return tokens;
}

function getExt(lang) {
  const map = {
    'C': 'c', 'C++': 'cpp', 'C#': 'cs', 'Python': 'py',
    'JavaScript': 'js', 'TypeScript': 'ts', 'Java': 'java',
    'HTML': 'html', 'CSS': 'css', 'Markdown': 'md'
  };
  return map[lang] || 'js';
}

// ── Supabase persistence ─────────────────────

/**
 * Resolve thumbnail for a project:
 *  1. If DB already has one → return it unchanged
 *  2. Otherwise → generate with canvas → persist to Supabase → return data URL
 *
 * @param {Object}  project  — Supabase project row
 * @param {boolean} persist  — save to Supabase after generation (default true)
 * @returns {Promise<{thumbnail_url:string, alt_text:string}>}
 */
async function resolveThumbnail(project, persist = true) {
  if (project.thumbnail && project.thumbnail.trim() !== '') {
    return {
      thumbnail_url: project.thumbnail,
      alt_text: `${project.title} thumbnail`
    };
  }

  const dataUrl = generateThumbnail(project);

  if (persist && project.id) {
    try {
      const supabase = getSupabase();
      await supabase
        .from('projects')
        .update({ thumbnail: dataUrl, updated_at: new Date().toISOString() })
        .eq('id', project.id);
    } catch (e) {
      console.warn('[ThumbnailService] Supabase save failed:', e.message);
    }
  }

  const lang = project.language
    || (project.tech_stack && project.tech_stack[0])
    || 'code';

  return {
    thumbnail_url: dataUrl,
    alt_text: `${project.title} — ${lang} project`
  };
}

// ── Bulk generator for Admin Panel ───────────

/**
 * Generate thumbnails for all projects that don't have one yet.
 * @param {Function} onProgress  — (done, total, title) callback
 * @returns {Promise<{resolved:number, failed:number}>}
 */
async function bulkGenerateThumbnails(onProgress) {
  const supabase = getSupabase();
  let resolved = 0, failed = 0;

  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .or('thumbnail.is.null,thumbnail.eq.');

  if (error) throw error;
  if (!projects || projects.length === 0) {
    if (onProgress) onProgress(0, 0, 'All thumbnails already set!');
    return { resolved: 0, failed: 0 };
  }

  const total = projects.length;

  for (let i = 0; i < total; i++) {
    const proj = projects[i];
    if (onProgress) onProgress(i, total, proj.title);
    try {
      await resolveThumbnail(proj, true);
      resolved++;
    } catch (e) {
      console.error('[ThumbnailService] Failed for:', proj.title, e);
      failed++;
    }
    // Tiny delay so UI stays responsive
    await new Promise(r => setTimeout(r, 80));
  }

  if (onProgress) onProgress(total, total, 'Done!');
  return { resolved, failed };
}
