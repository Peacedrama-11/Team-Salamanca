import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadCvFile } from './cv-upload.ts';

const result = { skills: [{ name: 'Python', level: 'unspecified' as const }], experienceYears: null, warnings: [] };

test('reads a local snapshot before sending and preserves filename, MIME and bytes', async () => {
  const original = new File(['synthetic CV'], 'sample.pdf', { type: 'application/pdf' });
  const controller = new AbortController();
  const actual = await uploadCvFile(original, controller.signal, async ({ file }, options) => {
    assert.notEqual(file, original);
    assert.equal((file as File).name, 'sample.pdf');
    assert.equal(file.type, 'application/pdf');
    assert.equal(await file.text(), 'synthetic CV');
    assert.equal(options.signal, controller.signal);
    return result;
  });
  assert.deepEqual(actual, result);
});

test('unreadable file fails before any upload with a useful local-file error', async () => {
  const original = new File(['synthetic'], 'sample.pdf');
  original.arrayBuffer = async () => { throw new DOMException('File changed on disk', 'NotReadableError'); };
  let sent = false;
  await assert.rejects(uploadCvFile(original, new AbortController().signal, async () => {
    sent = true; return result;
  }), /browser could not read.*local copy/i);
  assert.equal(sent, false);
});

test('network failures are distinguished from parser responses', async () => {
  const original = new File(['synthetic'], 'sample.pdf');
  await assert.rejects(uploadCvFile(original, new AbortController().signal, async () => {
    throw new TypeError('Failed to fetch');
  }), /browser read the file.*connection or browser upload error/i);
  const serverError = Object.assign(new Error('Bad Request'), { data: { error: 'Scanned PDF; enter skills manually.' } });
  await assert.rejects(uploadCvFile(original, new AbortController().signal, async () => { throw serverError; }),
    error => error === serverError);
});

test('cancelled selection does not send a stale file', async () => {
  const original = new File(['synthetic'], 'sample.pdf');
  const controller = new AbortController(); controller.abort();
  let sent = false;
  await assert.rejects(uploadCvFile(original, controller.signal, async () => {
    sent = true; return result;
  }), { name: 'AbortError' });
  assert.equal(sent, false);
});
