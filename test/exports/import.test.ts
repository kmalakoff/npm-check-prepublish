import assert from 'assert';
import { CheckPrepublish, loadConfig, mergeConfig } from 'npm-check-prepublish';

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
});
