import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addLearningPath, learningPaths, questions, rankLearningPaths, toggleLearningPath, type Answers } from './learning-paths.ts';
import { loadLearningSelections, saveLearningSelections } from './learning-path-storage.ts';

test('catalog has exactly the supplied 15 fixed, unique roadmap URLs', () => {
  const slugs = ['frontend', 'backend', 'full-stack', 'ai-engineer', 'machine-learning', 'ai-data-scientist', 'data-analyst', 'data-engineer', 'devops', 'mlops', 'cyber-security', 'ux-design', 'qa', 'android', 'game-developer'];
  assert.deepEqual(learningPaths.map(path => path.url), slugs.map(slug => `https://roadmap.sh/${slug}?utm_source=chatgpt.com`));
  assert.equal(new Set(learningPaths.map(path => path.id)).size, 15);
  for (const path of learningPaths) {
    assert.ok(path.description);
    for (const [index, tags] of [path.interest, path.activity, path.experience].entries()) {
      assert.ok(tags.every(tag => Number.isInteger(tag) && questions[index].options[tag]));
    }
  }
});

test('every answer combination ranks all paths deterministically with exact 5/3/1 weights', () => {
  for (let interest = 0; interest < 6; interest++) for (let activity = 0; activity < 6; activity++) for (let experience = 0; experience < 6; experience++) {
    const answers: Answers = [interest, activity, experience];
    const ranked = rankLearningPaths(answers);
    assert.equal(ranked.length, 15);
    assert.equal(new Set(ranked.map(item => item.path.id)).size, 15);
    assert.deepEqual(ranked, rankLearningPaths(answers));
    ranked.forEach((item, index) => {
      assert.equal(item.score, (item.path.interest.includes(interest) ? 5 : 0) + (item.path.activity.includes(activity) ? 3 : 0) + (item.path.experience.includes(experience) ? 1 : 0));
      if (index) assert.ok(ranked[index - 1].score >= item.score);
      assert.ok(item.reasons.length);
    });
  }
});

test('beginners can receive AI Engineering; interest and activity outweigh experience', () => {
  assert.ok(rankLearningPaths([1, 3, 0]).slice(0, 3).some(item => item.path.id === 'ai-engineer'));
  assert.equal(rankLearningPaths([4, 0, 4])[0].path.id, 'ux-design');
  assert.equal(rankLearningPaths([3, 5, 0])[0].path.id, 'cyber-security');
  assert.equal(rankLearningPaths([2, 2, 3]).find(item => item.path.id === 'data-analyst')?.score, 9);
  assert.throws(() => rankLearningPaths([-1, 0, 0]));
});

test('adding, stopping and restarting preserve original timestamps and avoid duplicate records', () => {
  const added = '2026-10-25T01:00:00.000Z';
  const stopped = '2026-10-25T01:01:00.000Z';
  const restarted = '2026-10-25T01:02:00.000Z';
  const initial = addLearningPath([], 'frontend', added);
  assert.deepEqual(initial, [{ pathId: 'frontend', active: true, addedAt: added, startedAt: added, stoppedAt: null }]);
  assert.strictEqual(addLearningPath(initial, 'frontend', restarted), initial);
  assert.strictEqual(addLearningPath(initial, 'unknown', restarted), initial);
  const paused = toggleLearningPath(initial, 'frontend', stopped);
  assert.equal(paused[0].active, false);
  assert.equal(paused[0].stoppedAt, stopped);
  const resumed = toggleLearningPath(paused, 'frontend', restarted);
  assert.deepEqual(resumed[0], { pathId: 'frontend', active: true, addedAt: added, startedAt: restarted, stoppedAt: stopped });
  assert.equal(initial[0].active, true);
  assert.equal(initial[0].stoppedAt, null);
  assert.equal(addLearningPath(resumed, 'backend', restarted).length, 2);
});

test('learning selections persist separately by normalized email and reload after refresh', () => {
  const entries = new Map<string, string>();
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => { entries.set(key, value); },
    } },
  });
  try {
    const selection = addLearningPath([], 'backend', '2026-10-25T04:05:06.000Z');
    saveLearningSelections(selection, ' Person@Example.com ');

    assert.deepEqual(loadLearningSelections('person@example.com'), selection);
    assert.deepEqual(loadLearningSelections('another@example.com'), []);
    assert.equal(entries.size, 1);

    saveLearningSelections(addLearningPath([], 'frontend', '2026-10-25T04:05:06.000Z'), 'another@example.com');
    assert.deepEqual(loadLearningSelections('another@example.com').map(item => item.pathId), ['frontend']);
    assert.deepEqual(loadLearningSelections('PERSON@example.com'), selection);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('corrupt and unknown browser records are ignored without exposing another email’s data', () => {
  const entries = new Map<string, string>([
    ['futurique-learning-paths:v1:person@example.com', JSON.stringify([
      { pathId: 'missing-path', addedAt: '2026-10-25T04:05:06.000Z', startedAt: '2026-10-25T04:05:06.000Z', stoppedAt: null, active: true },
      { pathId: 'frontend', addedAt: 'invalid', startedAt: 'invalid', stoppedAt: null, active: true },
      { pathId: 'frontend', addedAt: '2026-10-25T04:05:06.000Z', startedAt: '2026-10-25T04:05:06.000Z', stoppedAt: null, active: true },
      { pathId: 'frontend', addedAt: '2026-10-25T04:05:06.000Z', startedAt: '2026-10-25T04:05:06.000Z', stoppedAt: null, active: true },
    ])],
    ['futurique-learning-paths:v1:broken@example.com', 'not json'],
  ]);
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => { entries.set(key, value); },
    } },
  });
  try {
    assert.deepEqual(loadLearningSelections('person@example.com').map(item => item.pathId), ['frontend']);
    assert.deepEqual(loadLearningSelections('broken@example.com'), []);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
