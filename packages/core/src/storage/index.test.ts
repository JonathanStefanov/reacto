import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { LocalStorage, setDefaultStorage, getDefaultStorage } from './index.js';

describe('LocalStorage', () => {
  const testDir = path.join(process.cwd(), '.test-uploads');
  let storage: LocalStorage;

  beforeEach(() => {
    storage = new LocalStorage({ uploadDir: testDir, urlPrefix: '/uploads' });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('creates upload directory on init', () => {
    expect(fs.existsSync(testDir)).toBe(true);
  });

  it('stores a file and returns metadata', async () => {
    const buffer = Buffer.from('hello world');
    const result = await storage.store(buffer, 'test.txt', 'text/plain');

    expect(result.originalName).toBe('test.txt');
    expect(result.filename).toMatch(/\.txt$/);
    expect(result.mimeType).toBe('text/plain');
    expect(result.size).toBe(11);
    expect(result.path).toMatch(/^\/uploads\//);
    expect(result.storage).toBe('local');
  });

  it('stores a file in a subdirectory', async () => {
    const buffer = Buffer.from('image data');
    const result = await storage.store(buffer, 'photo.jpg', 'image/jpeg', 'avatars');

    expect(result.path).toMatch(/^\/uploads\/avatars\//);
    expect(fs.existsSync(path.join(testDir, 'avatars', result.filename))).toBe(true);
  });

  it('generates unique filenames', async () => {
    const buffer = Buffer.from('data');
    const result1 = await storage.store(buffer, 'file.txt', 'text/plain');
    const result2 = await storage.store(buffer, 'file.txt', 'text/plain');

    expect(result1.filename).not.toBe(result2.filename);
  });

  it('checks if a file exists', async () => {
    const buffer = Buffer.from('hello');
    const result = await storage.store(buffer, 'test.txt', 'text/plain');

    expect(storage.exists(result.path)).toBe(true);
    expect(storage.exists('/uploads/nonexistent.txt')).toBe(false);
  });

  it('reads a file', async () => {
    const buffer = Buffer.from('hello world');
    const result = await storage.store(buffer, 'test.txt', 'text/plain');

    const readBuffer = storage.read(result.path);
    expect(readBuffer.toString()).toBe('hello world');
  });

  it('deletes a file', async () => {
    const buffer = Buffer.from('to be deleted');
    const result = await storage.store(buffer, 'delete-me.txt', 'text/plain');

    expect(storage.exists(result.path)).toBe(true);
    await storage.delete(result.path);
    expect(storage.exists(result.path)).toBe(false);
  });

  it('handles deleting non-existent file gracefully', async () => {
    await storage.delete('/uploads/does-not-exist.txt');
    // Should not throw
  });
});

describe('setDefaultStorage / getDefaultStorage', () => {
  afterEach(() => {
    // Reset
    const testDir = path.join(process.cwd(), '.test-uploads-reset');
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('returns LocalStorage by default', () => {
    const storage = getDefaultStorage();
    expect(storage).toBeInstanceOf(LocalStorage);
  });

  it('uses custom storage when set', () => {
    const custom = new LocalStorage({ uploadDir: '/tmp/custom-uploads' });
    setDefaultStorage(custom);
    expect(getDefaultStorage()).toBe(custom);
  });
});
