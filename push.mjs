#!/usr/bin/env node
/**
 * Push all files to GitHub via API (for fine-grained PATs that don't support git push)
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const TOKEN = process.env.GH_TOKEN;
const OWNER = 'JonathanStefanov';
const REPO = 'reacto';
const BRANCH = 'main';

const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
};

// Collect all files
function collectFiles(dir, base = dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
      files.push(...collectFiles(full, base));
    } else {
      files.push({ path: relative(base, full), fullPath: full });
    }
  }
  return files;
}

async function apiCall(endpoint, method = 'GET', body = null) {
  const opts = { method, headers: HEADERS };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${endpoint}`, opts);
  const data = await res.json();
  if (!res.ok) {
    console.error(`API Error ${res.status}:`, data);
    process.exit(1);
  }
  return data;
}

async function main() {
  const root = process.argv[2] || '.';
  const files = collectFiles(root);
  console.log(`Found ${files.length} files to upload`);

  // Step 1: Create blobs
  console.log('Creating blobs...');
  const treeEntries = [];
  for (const file of files) {
    const content = readFileSync(file.fullPath, 'utf-8');
    const blob = await apiCall('/git/blobs', 'POST', {
      content,
      encoding: 'utf-8',
    });
    treeEntries.push({
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    });
    process.stdout.write(`  ${file.path}\n`);
  }

  // Step 2: Get current commit SHA
  const ref = await apiCall(`/git/refs/heads/${BRANCH}`);
  const currentCommitSha = ref.object.sha;
  const currentCommit = await apiCall(`/git/commits/${currentCommitSha}`);
  const baseTreeSha = currentCommit.tree.sha;

  // Step 3: Create tree
  console.log('Creating tree...');
  const tree = await apiCall('/git/trees', 'POST', {
    base_tree: baseTreeSha,
    tree: treeEntries,
  });

  // Step 4: Create commit
  console.log('Creating commit...');
  const commit = await apiCall('/git/commits', 'POST', {
    message: 'feat: Phase 0 — full monorepo with core ORM, server, and CLI\n\n- @reacto/core: Django-style ORM with decorators, fields, query builder, migrations\n- @reacto/server: Express server with auto-generated CRUD routes\n- reacto CLI: dev, migrate, makemigrations, generate, status, createsuperuser\n- TypeScript strict mode, Vitest, Turborepo monorepo\n- MIT License, README, CONTRIBUTING guide',
    tree: tree.sha,
    parents: [currentCommitSha],
  });

  // Step 5: Update ref
  console.log('Updating ref...');
  await apiCall(`/git/refs/heads/${BRANCH}`, 'PATCH', {
    sha: commit.sha,
    force: true,
  });

  console.log(`\n✅ Pushed ${files.length} files to ${OWNER}/${REPO}@${BRANCH}`);
  console.log(`   Commit: ${commit.sha}`);
  console.log(`   URL: https://github.com/${OWNER}/${REPO}`);
}

main().catch(console.error);
