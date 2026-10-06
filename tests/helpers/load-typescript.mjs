import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
export function createLoader(globals = {}) {
  const cache = new Map();
  function load(file) {
    const url = new URL(file, import.meta.url);
    if (cache.has(url.href)) return cache.get(url.href);
    const source = readFileSync(url, 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    });
    const exports = {};
    cache.set(url.href, exports);
    runInNewContext(outputText, { exports, TextEncoder, ...globals, require: name => {
      if (name.startsWith('.') || name.startsWith('@/')) {
        const dependency = name.startsWith('@/')
          ? new URL('../../src/' + name.slice(2) + '.ts', import.meta.url)
          : new URL(name + '.ts', url);
        return load(dependency.href);
      }
      return require(name);
    } });
    return exports;
  }
  return load;
}

export const plain = value => JSON.parse(JSON.stringify(value));
