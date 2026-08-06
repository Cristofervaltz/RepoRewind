import { describe, it, expect, vi } from 'vitest';
import { analyzeGitHistory } from './gitAnalyzer';
import fs from 'fs';

// Mock child_process for testing without a real git repo
vi.mock('child_process', () => ({
  execSync: vi.fn(() => Buffer.from(`COMMIT|abcdef2|Author|2023-01-02|Add features
A\tsrc/index.ts
M\tREADME.md
COMMIT|abcdef1|Author|2023-01-01|Init
A\tREADME.md`))
}));

// Mock fs to simulate a valid repo
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => true)
  }
}));

describe('analyzeGitHistory', () => {
  it('should parse git log output into Commit objects', async () => {
    const history = await analyzeGitHistory('.');
    
    expect(history.repoName).toBeDefined();
    expect(typeof history.repoName).toBe('string');
    
    // Commits are reversed (oldest first)
    expect(history.commits.length).toBe(2);
    
    const firstCommit = history.commits[0];
    expect(firstCommit.hash).toBe('abcdef1');
    expect(firstCommit.message).toBe('Init');
    expect(firstCommit.changes.length).toBe(1);
    expect(firstCommit.changes[0].status).toBe('A');
    expect(firstCommit.changes[0].path).toBe('README.md');

    const secondCommit = history.commits[1];
    expect(secondCommit.hash).toBe('abcdef2');
    expect(secondCommit.changes.length).toBe(2);
    expect(secondCommit.changes[0].status).toBe('A');
    expect(secondCommit.changes[0].path).toBe('src/index.ts');
  });
});
