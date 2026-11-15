import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, onTestFinished, test } from 'vitest';
import type { RecordingStatus } from '../../../src/recorder/recorder.types.ts';
import { StatusFile } from '../../../src/recorder/statusFile.service.ts';

/** A recording under way. */
const STATUS: RecordingStatus = { pid: 42, city: 'kyiv', out: '/videos/kyiv.mp4', phase: 'recording', seconds: 12, limit: 900, error: null };

/**
 * A folder of the test's own, taken away after it.
 *
 * @returns Its path.
 */
const folderApart = (): string => {
  const folder = mkdtempSync(join(tmpdir(), 'raillineage-'));
  onTestFinished(() => {
    rmSync(folder, { recursive: true });
  });
  return folder;
};

describe('StatusFile', () => {
  test('reads back what it wrote, in a folder it makes, leaving nothing half-written beside it', () => {
    const folder = folderApart();
    const file = new StatusFile(join(folder, '.cache', 'recording.json'));
    file.write(STATUS);
    file.write({ ...STATUS, phase: 'done', seconds: 594 });
    expect(file.read()).toEqual({ ...STATUS, phase: 'done', seconds: 594 });
    expect(readdirSync(join(folder, '.cache'))).toEqual(['recording.json']);
  });

  test('reads nothing where none was written, or what it cannot read', () => {
    const folder = folderApart();
    expect(new StatusFile(join(folder, 'none.json')).read()).toBeNull();
    writeFileSync(join(folder, 'broken.json'), '{"pid":');
    expect(new StatusFile(join(folder, 'broken.json')).read()).toBeNull();
  });
});
