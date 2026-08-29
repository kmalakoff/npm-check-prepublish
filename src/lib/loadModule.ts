import { loadModule as loadModuleCallback } from 'module-compat';

/**
 * Load a CJS or ESM file as itself, feature-detecting the mechanism (require vs import).
 */
export default function loadModule(filePath: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    loadModuleCallback(filePath, (err, mod) => (err ? reject(err) : resolve(mod)));
  });
}
