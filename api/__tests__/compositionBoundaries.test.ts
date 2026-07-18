import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const apiRoot = path.resolve(__dirname, '..');
const importPattern = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;

function resolveLocalImport(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  for (const candidate of [`${base}.ts`, path.join(base, 'index.ts')]) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`Unresolved local import ${specifier} from ${fromFile}`);
}

function reachableFiles(entry: string): Set<string> {
  const visited = new Set<string>();
  const visit = (file: string) => {
    if (visited.has(file)) return;
    visited.add(file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(importPattern)) {
      const dependency = resolveLocalImport(file, match[1]!);
      if (dependency) visit(dependency);
    }
  };
  visit(path.join(apiRoot, entry));
  return new Set([...visited].map((file) => path.relative(apiRoot, file)));
}

function infrastructureReached(entry: string): string[] {
  return [...reachableFiles(entry)]
    .filter((file) => file.startsWith('_server/infrastructure/'))
    .sort();
}

describe('composition import boundaries', () => {
  it('keeps health composition limited to store infrastructure', () => {
    expect(infrastructureReached('_server/composition/health.ts')).toEqual([
      '_server/infrastructure/store/index.ts',
    ]);
  });

  it('keeps feedback composition limited to forms and store infrastructure', () => {
    expect(infrastructureReached('_server/composition/feedback.ts')).toEqual([
      '_server/infrastructure/notifications.ts',
      '_server/infrastructure/store/index.ts',
    ]);
  });

  it('keeps thin handlers pointed at feature-specific composition modules', () => {
    expect(readFileSync(path.join(apiRoot, 'health.ts'), 'utf8')).toContain(
      "'./_server/composition/health'",
    );
    expect(readFileSync(path.join(apiRoot, 'feedback.ts'), 'utf8')).toContain(
      "'./_server/composition/feedback'",
    );
    expect(readFileSync(path.join(apiRoot, 'feedback-general.ts'), 'utf8')).toContain(
      "'./_server/composition/feedback'",
    );
  });
});
