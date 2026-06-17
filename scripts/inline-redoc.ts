/**
 * Post-processes docs/api/index.html to replace the CDN Redoc script reference
 * with the locally installed bundle, producing a fully offline single file.
 *
 * @redocly/cli@2.33.2 always emits <script src="https://cdn.redocly.com/...">
 * in its default template. This script replaces that tag with inline JS so
 * docs/api/index.html renders with zero network requests.
 *
 * Run via: npm run docs:api:html (called automatically after build-docs)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const htmlPath = path.join(process.cwd(), 'docs', 'api', 'index.html');
const bundlePath = path.join(
  process.cwd(),
  'node_modules',
  '@redocly',
  'cli',
  'node_modules',
  'redoc',
  'bundles',
  'redoc.standalone.js',
);

if (!fs.existsSync(htmlPath)) {
  console.error(`Not found: ${htmlPath}`);
  process.exit(1);
}
if (!fs.existsSync(bundlePath)) {
  console.error(
    `Redoc bundle not found at expected path: ${bundlePath}\n` +
      'The @redocly/cli install may have changed. Update the bundlePath in this script.',
  );
  process.exit(1);
}

let html = fs.readFileSync(htmlPath, 'utf8');
const bundle = fs.readFileSync(bundlePath, 'utf8');

// Replace the CDN <script src="...redoc.standalone.js"> with an inline <script> block.
const cdnPattern = /<script src="https?:\/\/cdn\.redocly\.com\/[^"]*redoc\.standalone\.js"><\/script>/;
if (!cdnPattern.test(html)) {
  // Check if already inlined (idempotent re-runs).
  if (html.includes('RedocStandalone') || html.includes('/* redoc-inline */')) {
    console.log('docs/api/index.html already has Redoc inlined - no-op');
    process.exit(0);
  }
  console.error('CDN script tag not found in index.html. Output from build-docs may have changed.');
  process.exit(1);
}

// Use function form to prevent $ in the bundle being interpreted as replace() special patterns
// ($' = after-match, $` = before-match). A function return value is used verbatim.
html = html.replace(cdnPattern, () => `<script>/* redoc-inline */\n${bundle}\n</script>`);

// Also strip the Google Fonts link if present (build-docs may emit it without --disableGoogleFont).
html = html.replace(
  /<link href="https:\/\/fonts\.googleapis\.com\/[^"]*" rel="stylesheet">/g,
  '',
);

fs.writeFileSync(htmlPath, html, 'utf8');

const sizeKiB = Math.round(fs.statSync(htmlPath).size / 1024);
console.log(`docs/api/index.html inlined Redoc bundle (${sizeKiB} KiB) - fully offline`);
