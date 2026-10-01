import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getLoginMethod } from '../src/utils/account.js';

test('identifica a forma de acesso pelo identificador do Auth0', () => {
  assert.equal(getLoginMethod('google-oauth2|1234567890'), 'google');
  assert.equal(getLoginMethod('auth0|abcdef'), 'password');
  assert.equal(getLoginMethod('windowslive|xyz'), 'other');
  assert.equal(getLoginMethod(undefined), 'other');
});
