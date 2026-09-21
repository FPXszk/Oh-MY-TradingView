import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { marked } from 'marked';

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function reportTitle(markdown) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1] ?? 'Screener Report';
  return heading.replaceAll('**', '').replaceAll('`', '');
}

export function renderMarkdownReport(markdown) {
  const content = marked.parse(markdown, { gfm: true })
    .replaceAll('<table>', '<div class="table-scroll"><table>')
    .replaceAll('</table>', '</table></div>');
  const title = escapeHtml(reportTitle(markdown));

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      margin: 0;
      color: #1f2937;
      background: #f3f4f6;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      line-height: 1.6;
    }
    main {
      width: min(1800px, calc(100% - 32px));
      margin: 24px auto;
      padding: 24px;
      box-sizing: border-box;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 12px;
      box-shadow: 0 4px 18px rgb(15 23 42 / 8%);
    }
    h1, h2, h3 { line-height: 1.3; }
    h2 { margin-top: 2.2rem; border-bottom: 2px solid #dbeafe; padding-bottom: .35rem; }
    code { padding: .1rem .3rem; border-radius: 4px; background: #f3f4f6; }
    .table-scroll {
      margin: 1rem 0 2rem;
      overflow-x: auto;
      border: 1px solid #d1d5db;
      border-radius: 8px;
    }
    table { width: max-content; min-width: 100%; border-collapse: separate; border-spacing: 0; font-size: .86rem; }
    th, td { padding: .55rem .7rem; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
    th { position: sticky; top: 0; z-index: 1; color: #111827; background: #e5eefc; font-weight: 700; }
    th:first-child, td:first-child { position: sticky; left: 0; }
    th:first-child { z-index: 2; }
    td:first-child { background: #fff; }
    tr:nth-child(even) td { background: #f9fafb; }
    tr:nth-child(even) td:first-child { background: #f9fafb; }
    tr:hover td { background: #eff6ff; }
    a { color: #1d4ed8; }
    @media (prefers-color-scheme: dark) {
      body { color: #e5e7eb; background: #111827; }
      main { background: #1f2937; border-color: #4b5563; }
      code { background: #374151; }
      .table-scroll { border-color: #4b5563; }
      th { color: #f9fafb; background: #334155; }
      th, td { border-color: #4b5563; }
      td:first-child, tr:nth-child(even) td:first-child { background: #1f2937; }
      tr:nth-child(even) td { background: #273449; }
      tr:hover td { background: #374151; }
      a { color: #93c5fd; }
    }
  </style>
</head>
<body>
  <main>
${content}
  </main>
</body>
</html>
`;
}

function optionValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const input = optionValue('--input');
  const output = optionValue('--output');
  if (!input || !output) {
    throw new Error('Usage: node render-markdown-report.mjs --input <report.md> --output <report.html>');
  }

  const inputPath = resolve(input);
  const outputPath = resolve(output);
  const markdown = await readFile(inputPath, 'utf8');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderMarkdownReport(markdown), 'utf8');
  console.log(`[screener] HTML report written to ${outputPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
