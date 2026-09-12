import assert from 'assert';
import { CheckPrepublish, type FileConfig, loadConfig, mergeConfig, type VerifyConfig } from 'npm-check-prepublish';

describe('exports .ts', () => {
  it('CheckPrepublish', () => {
    assert.equal(typeof CheckPrepublish, 'function');
  });
  it('loadConfig', () => {
    assert.equal(typeof loadConfig, 'function');
  });
  it('mergeConfig', () => {
    assert.equal(typeof mergeConfig, 'function');
  });
  it('FileConfig', () => {
    const config: FileConfig = {
      skipBuild: true,
      skipCheckImport: false,
      requiredFiles: ['README.md'],
    };
    assert.ok(config);
  });
  it('VerifyConfig', () => {
    const config: VerifyConfig = {
      packageDir: '/test',
      skipBuild: true,
      logger: console,
    };
    assert.ok(config);
  });
});
