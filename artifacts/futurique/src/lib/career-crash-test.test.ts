import test from 'node:test';
import assert from 'node:assert/strict';
import { getCrashScenarios, workOptions, taskOptions, CRASH_DISCLAIMER, type CrashAnswers } from './career-crash-test.ts';

test('all 30 answer combinations produce two complete, distinct and deterministic scenarios', () => {
  for (const work of workOptions) for (const task of taskOptions) {
    const answers = { workType: work.id, taskType: task.id };
    const results = getCrashScenarios(answers);
    assert.deepEqual(results, getCrashScenarios(answers));
    assert.deepEqual(results.map(s => s.id), ['gradual', 'redesign']);
    assert.notDeepEqual(results[0].changes, results[1].changes);
    for (const scenario of results) {
      assert.equal(scenario.changes.length, 3);
      assert.ok(scenario.skills.length >= 2 && scenario.skills.length <= 3);
      assert.equal(scenario.actions.length, 2);
      for (const lines of [scenario.changes, scenario.skills, scenario.actions]) {
        assert.equal(new Set(lines).size, lines.length);
        assert.ok(lines.every(line => line.trim().length > 0));
      }
      assert.doesNotMatch(JSON.stringify(scenario), /\d+\s*%|automation probability|risk score/i);
    }
  }
});

test('both answers independently affect each scenario', () => {
  const baseline = getCrashScenarios({ workType: 'software-it', taskType: 'admin' });
  const changedWork = getCrashScenarios({ workType: 'customer-service', taskType: 'admin' });
  const changedTask = getCrashScenarios({ workType: 'software-it', taskType: 'communication' });
  for (const index of [0, 1]) for (const field of ['changes', 'skills', 'actions'] as const) {
    assert.notDeepEqual(baseline[index][field], changedWork[index][field]);
    assert.notDeepEqual(baseline[index][field], changedTask[index][field]);
  }
});

test('Other is a supported choice and generated results cannot mutate shared content', () => {
  const answers = { workType: 'other', taskType: 'analysis' } as const;
  const expected = getCrashScenarios(answers);
  const modified = getCrashScenarios(answers);
  modified[0].changes.pop();
  modified[1].skills.push('Not in the predefined content');
  modified[0].actions[0] = 'Changed';
  assert.deepEqual(getCrashScenarios(answers), expected);
});

test('invalid or inherited option names are rejected rather than producing misleading results', () => {
  for (const answers of [
    { workType: 'unknown', taskType: 'admin' },
    { workType: 'software-it', taskType: 'toString' },
    { workType: '__proto__', taskType: 'admin' },
  ]) assert.throws(() => getCrashScenarios(answers as CrashAnswers), /Choose a valid/);
});

test('disclaimer matches the required non-prediction wording exactly', () => {
  assert.equal(CRASH_DISCLAIMER, 'These are illustrative what-if scenarios, not personalized forecasts or predictions based on actual labor-market data.');
});
