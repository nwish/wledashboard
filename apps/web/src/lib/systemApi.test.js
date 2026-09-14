import test from 'node:test'
import assert from 'node:assert/strict'
import { systemApi } from './api.js'

test('systemApi definition and exported interface', (t) => {
  assert.equal(typeof systemApi.getHealth, 'function')
  assert.equal(typeof systemApi.getLogs, 'function')
  assert.equal(typeof systemApi.clearLogs, 'function')
  assert.equal(typeof systemApi.runDiagnostics, 'function')
  assert.equal(typeof systemApi.restartPoller, 'function')
  assert.equal(typeof systemApi.clearCache, 'function')
  assert.equal(typeof systemApi.resetSpatial, 'function')
  assert.equal(typeof systemApi.factoryReset, 'function')
})
