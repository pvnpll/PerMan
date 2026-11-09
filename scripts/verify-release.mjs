#!/usr/bin/env node
/**
 * PerMan Release & Environment Verification Harness (PM-204)
 * Verifies local assets, migration isolation, and endpoint availability.
 *
 * Usage:
 *   node scripts/verify-release.mjs [baseUrl]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const targetUrl = process.argv[2] || process.env.PERMAN_URL || 'https://perman.pvnpll.in';

console.log('--- PerMan Verification Harness ---');
console.log(`Target URL: ${targetUrl}`);
console.log(`Root Dir:   ${rootDir}`);

let failed = false;

function check(label, condition, details = '') {
  if (condition) {
    console.log(`[PASS] ${label}`);
  } else {
    console.error(`[FAIL] ${label} ${details}`);
    failed = true;
  }
}

// 1. Verify OCR Assets
const ocrWorker = path.join(rootDir, 'public/ocr/worker.min.js');
const ocrLang = path.join(rootDir, 'public/ocr/lang/eng.traineddata.gz');
const ocrCoreDir = path.join(rootDir, 'public/ocr/core');

check('OCR worker exists', fs.existsSync(ocrWorker));
check('OCR language data exists', fs.existsSync(ocrLang));
check('OCR core wasm directory exists', fs.existsSync(ocrCoreDir));

// 2. Verify Migration Files
const migration = path.join(rootDir, 'supabase/migrations/20261109065729_workspace_items.sql');
check('Workspace migration file exists', fs.existsSync(migration));

if (fs.existsSync(migration)) {
  const content = fs.readFileSync(migration, 'utf-8');
  check('Migration uses pm_ object prefix isolation', content.includes('pm_workspace_items') && content.includes('pm_complete_task'));
  check('Migration has RLS enabled', content.includes('enable row level security'));
  check('Migration includes recurrence count/end_date checks', content.includes('max_count') && content.includes('end_cutoff'));
}

// 3. Verify Zero-Secrets In Repository
const gitDir = path.join(rootDir, '.git');
if (fs.existsSync(gitDir)) {
  const envLocal = path.join(rootDir, '.env.local');
  if (fs.existsSync(envLocal)) {
    const gitignore = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf-8');
    const isIgnored = gitignore.split('\n').some(line => {
      const trimmed = line.trim();
      return trimmed === '.env*' || trimmed === '.env.local' || trimmed === '.env*.local';
    });
    check('.env.local is ignored in .gitignore', isIgnored);
  }
}

// 4. Verify Live / Staged Endpoint
try {
  const res = await fetch(targetUrl, { method: 'HEAD', redirect: 'follow' });
  check(`Endpoint reachable (HTTP ${res.status})`, res.status >= 200 && res.status < 400, `got ${res.status}`);
} catch (err) {
  check(`Endpoint reachable at ${targetUrl}`, false, err.message);
}

if (failed) {
  console.error('\nVerification completed with errors.');
  process.exit(1);
} else {
  console.log('\nAll checks passed successfully.');
}
