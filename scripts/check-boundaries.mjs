#!/usr/bin/env node
/**
 * Static import-boundary checker for Achievo.
 * Walks TypeScript sources and enforces package / feature / server ownership rules.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

const importPattern =
  /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === 'coverage') continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|mts|cts)$/.test(entry) && !entry.endsWith('.d.ts')) acc.push(full);
  }
  return acc;
}

function rel(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function resolveLocal(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function packageNameOf(fileRel) {
  const m = fileRel.match(/^packages\/([^/]+)\//);
  return m ? m[1] : null;
}

function featureNameOf(fileRel) {
  const m = fileRel.match(/^frontend\/src\/features\/([^/]+)\//);
  return m ? m[1] : null;
}

function isFeaturePublicEntry(specifier, fromFeature) {
  // Allow same-feature internals and public barrels / lazy entry.
  if (!specifier.includes('/features/')) {
    // relative sibling feature paths like ../earn or ../earn/index
    const sibling = specifier.match(/^\.\.\/(dashboard|earn|feedback|history|onboarding|profile|wallet)(?:\/(.*))?$/);
    if (!sibling) return true;
    const target = sibling[1];
    if (target === fromFeature) return true;
    const rest = sibling[2] ?? '';
    return rest === '' || rest === 'index' || rest === 'index.ts' || rest === 'lazy' || rest === 'lazy.ts';
  }
  return /\/features\/[^/]+(?:\/index(?:\.(?:ts|tsx))?|\/lazy(?:\.(?:ts|tsx))?)?$/.test(specifier);
}

function collectImports(file) {
  const source = readFileSync(file, 'utf8');
  const specs = [];
  for (const match of source.matchAll(importPattern)) {
    const spec = match[1] ?? match[2];
    if (spec) specs.push(spec);
  }
  return specs;
}

function fail(file, message) {
  errors.push(`${rel(file)}: ${message}`);
}

const packageAllow = {
  shared: new Set([]),
  contracts: new Set(['@achievo/shared']),
  identity: new Set([]),
  stellar: new Set(['@achievo/shared', '@stellar/stellar-sdk']),
  sdk: new Set(['@achievo/contracts', '@achievo/shared']),
};

for (const file of walk(path.join(root, 'packages'))) {
  const fileRel = rel(file);
  if (fileRel.includes('/__tests__/') || fileRel.includes('/generated/')) continue;
  const pkg = packageNameOf(fileRel);
  if (!pkg) continue;
  for (const spec of collectImports(file)) {
    if (spec.includes('/frontend/') || spec.startsWith('../../frontend') || spec.includes('/api/')) {
      fail(file, `packages must not import app/api code (${spec})`);
    }
    if (spec.startsWith('@achievo/')) {
      const allowed = packageAllow[pkg] ?? new Set();
      if (!allowed.has(spec) && spec !== `@achievo/${pkg}`) {
        fail(file, `disallowed package import ${spec}`);
      }
    }
  }
}

for (const file of walk(path.join(root, 'api'))) {
  const fileRel = rel(file);
  if (fileRel.includes('/__tests__/') || fileRel.endsWith('vitest.config.ts')) continue;
  for (const spec of collectImports(file)) {
    if (spec.includes('/frontend/') || spec.startsWith('../frontend') || spec.startsWith('../../frontend')) {
      fail(file, `api must not import frontend (${spec})`);
    }
    if (fileRel.includes('/_server/features/') && (spec.includes('@vercel/node') || spec.includes('/infrastructure/'))) {
      fail(file, `feature core must not import Vercel or infrastructure (${spec})`);
    }
    if (fileRel.includes('/_server/infrastructure/') && (spec.includes('/features/') || spec.includes('/composition/'))) {
      fail(file, `infrastructure must not import features/composition (${spec})`);
    }
  }
}

const frontendSrc = path.join(root, 'frontend/src');
for (const file of walk(frontendSrc)) {
  const fileRel = rel(file);
  if (fileRel.includes('/__tests__/') || fileRel.includes('/test/')) continue;
  const fromFeature = featureNameOf(fileRel);
  const source = readFileSync(file, 'utf8');

  if (!fileRel.includes('/shared/api/') && !fileRel.includes('/packages/sdk/')) {
    if (/fetch\s*\(\s*[`'"]\/api\//.test(source)) {
      fail(file, 'raw /api fetch is forbidden outside @achievo/sdk / shared/api');
    }
  }

  for (const spec of collectImports(file)) {
    if (spec.includes('/api/') || spec.startsWith('../../api') || spec.startsWith('../../../api')) {
      fail(file, `frontend must not import api/ (${spec})`);
    }
    if (spec.includes('/packages/') && !spec.startsWith('@achievo/')) {
      fail(file, `deep packages/* imports are forbidden (${spec})`);
    }

    if (fileRel.startsWith('frontend/src/app/')) {
      const deepFeature = spec.match(/features\/(dashboard|earn|feedback|history|onboarding|profile|wallet)\/(.+)$/);
      if (deepFeature) {
        const rest = deepFeature[2];
        if (!(rest === 'index' || rest.startsWith('index.') || rest === 'lazy' || rest.startsWith('lazy.'))) {
          // Allow type-only relative deep paths only if resolved target is public entry.
          const resolved = resolveLocal(file, spec);
          if (resolved) {
            const resolvedRel = rel(resolved);
            const ok =
              /\/features\/[^/]+\/index\.(ts|tsx)$/.test(resolvedRel) ||
              /\/features\/[^/]+\/lazy\.(ts|tsx)$/.test(resolvedRel);
            if (!ok) fail(file, `app must import features through public roots (${spec})`);
          } else if (!isFeaturePublicEntry(spec, null)) {
            fail(file, `app must import features through public roots (${spec})`);
          }
        }
      }
    }

    if (fromFeature) {
      const sibling = spec.match(/^\.\.\/(dashboard|earn|feedback|history|onboarding|profile|wallet)(?:\/(.*))?$/);
      if (sibling && sibling[1] !== fromFeature) {
        const rest = sibling[2] ?? '';
        const publicOk = rest === '' || rest === 'index' || rest.startsWith('index.') || rest === 'lazy' || rest.startsWith('lazy.');
        if (!publicOk) fail(file, `no cross-feature internal imports (${spec})`);
      }
    }
  }
}

if (errors.length) {
  console.error('Boundary check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Boundary check passed.');
