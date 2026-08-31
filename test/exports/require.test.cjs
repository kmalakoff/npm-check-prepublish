const assert = require('assert');
const { CheckPrepublish, loadConfig, mergeConfig } = require('npm-check-prepublish');

describe('exports .cjs', () => {
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
