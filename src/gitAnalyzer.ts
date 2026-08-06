import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface FileChange {
  status: 'A' | 'M' | 'D' | 'R' | string;
  path: string;
}

export interface Commit {
  hash: string;
  author: string;
  date: string;
  message: string;
  changes: FileChange[];
}

export interface RepoHistory {
  commits: Commit[];
}

export async function analyzeGitHistory(repoPath: string): Promise<RepoHistory> {
  const absolutePath = path.resolve(repoPath);
  
  if (!fs.existsSync(path.join(absolutePath, '.git'))) {
    throw new Error('Not a git repository. Missing .git directory.');
  }

  // Use git log to get commit history and file changes
  // Format: Hash|Author|Date|Message
  // Followed by file status and path
  const gitCommand = `git --no-pager -C "${absolutePath}" log -n 1000 --name-status --pretty=format:"COMMIT|%H|%an|%ad|%s" --date=iso`;
  
  const output = execSync(gitCommand, { maxBuffer: 1024 * 1024 * 50 }).toString(); // 50MB buffer
  const lines = output.split('\n');

  const commits: Commit[] = [];
  let currentCommit: Commit | null = null;

  for (const line of lines) {
    if (line.startsWith('COMMIT|')) {
      const parts = line.split('|');
      currentCommit = {
        hash: parts[1],
        author: parts[2],
        date: parts[3],
        message: parts.slice(4).join('|'), // In case message has '|'
        changes: [],
      };
      commits.push(currentCommit);
    } else if (line.trim() !== '' && currentCommit) {
      // File change line (e.g. "A\tpath/to/file")
      const [status, filePath] = line.split('\t');
      if (status && filePath) {
        // Handle renames which have two tabs (R100\told_path\tnew_path)
        const actualPath = line.split('\t').pop() || filePath;
        currentCommit.changes.push({
          status: status.charAt(0), // Keep it simple (A, M, D, R)
          path: actualPath,
        });
      }
    }
  }

  // Commits come out newest first, let's reverse to oldest first for timeline playback
  commits.reverse();

  return { commits };
}
