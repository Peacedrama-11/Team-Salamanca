import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDictionary, canonicalName, normalizeSkills, normalizeProfile, keyFor } from './cv-profile.ts';

const dict = buildDictionary([{ name: 'JavaScript', aliases: ['JS'] }]);
test('aliases canonicalize and dedupe', () => {
  assert.equal(canonicalName(' js ', dict)?.name, 'JavaScript');
  const r = normalizeSkills([{ name: 'JS', level: 'advanced' }, { name: 'javascript', level: 'beginner' }, { name: '', level: 'x' }], dict);
  assert.deepEqual(r, [{ name: 'JavaScript', level: 'advanced' }]);
});
test('corrupt data is sanitized', () => {
  assert.equal(normalizeProfile('x'), null);
  assert.deepEqual(normalizeProfile({ skills: [{ name: 'Go', level: 'bogus' }], experienceYears: -3 }), { skills: [{ name: 'Go', level: 'unspecified' }], experienceYears: null });
});
test('keys are email scoped', () => { assert.equal(keyFor(' A@B.com '), keyFor('a@b.com')); assert.notEqual(keyFor('a@b.com'), keyFor('c@d.com')); });
