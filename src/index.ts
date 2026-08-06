import { Command } from 'commander';
import { analyzeGitHistory } from './gitAnalyzer';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';

const program = new Command();

program
  .name('reporewind')
  .description('3D Git History Visualizer CLI')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze a local git repository and launch the visualizer')
  .argument('[path]', 'Path to the git repository', '.')
  .option('-p, --port <number>', 'Port for the local web server', '3000')
  .action(async (repoPath, options) => {
    let currentRepoPath = path.resolve(repoPath);
    
    console.log(`Starting visualizer...`);

    const app = express();
    app.use(cors());
    app.use(express.json());

    // Serve UI build if it exists
    const isCompiled = __dirname.endsWith('dist');
    const uiPath = path.join(__dirname, isCompiled ? '../ui/dist' : '../ui/dist');
    if (!fs.existsSync(uiPath)) {
      console.log('Building UI for the first time... This might take a minute.');
      const uiRoot = path.join(__dirname, isCompiled ? '../ui' : '../ui');
      execSync('npm.cmd install', { cwd: uiRoot, stdio: 'inherit' });
      execSync('npm.cmd run build', { cwd: uiRoot, stdio: 'inherit' });
    }
    app.use(express.static(uiPath));

    app.get('/api/browse', (req, res) => {
      const script = `Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Select Git Repository'
$dialog.ShowNewFolderButton = $true

$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.ShowInTaskbar = $false
$form.WindowState = 'Minimized'
$form.Show()
$form.Activate()
$form.TopMost = $true

if ($dialog.ShowDialog($form) -eq 'OK') {
    Write-Output $dialog.SelectedPath
}
$form.Dispose()`;
      const scriptPath = path.join(os.tmpdir(), 'reporewind-browse.ps1');
      fs.writeFileSync(scriptPath, script);

      require('child_process').exec(`powershell -Sta -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`, (error: any, stdout: string) => {
        if (error) {
          return res.status(500).json({ error: 'Failed to open directory picker' });
        }
        res.json({ path: stdout.trim() });
      });
    });

    app.post('/api/analyze', async (req, res) => {
      const { path: newPath } = req.body;
      if (!newPath) return res.status(400).send('Missing path');
      try {
        currentRepoPath = path.resolve(newPath);
        const history = await analyzeGitHistory(currentRepoPath);
        res.json(history);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/analyze-github', async (req, res) => {
      const { url } = req.body;
      if (!url) return res.status(400).send('Missing URL');
      try {
        let repoSlug = url.replace('https://github.com/', '').replace('.git', '');
        if (repoSlug.startsWith('/')) repoSlug = repoSlug.substring(1);
        
        const cacheDir = path.join(os.tmpdir(), 'reporewind-cache', repoSlug);
        
        if (!fs.existsSync(cacheDir) || !fs.existsSync(path.join(cacheDir, '.git'))) {
          // If the dir exists but is empty/corrupt, remove it first
          if (fs.existsSync(cacheDir)) {
            fs.rmSync(cacheDir, { recursive: true, force: true });
          }
          fs.mkdirSync(path.dirname(cacheDir), { recursive: true });
          const cloneUrl = url.startsWith('http') ? url : `https://github.com/${repoSlug}.git`;
          execSync(`git clone --depth 1000 "${cloneUrl}" "${cacheDir}"`, { stdio: 'ignore' });
        }
        
        currentRepoPath = cacheDir;
        const history = await analyzeGitHistory(currentRepoPath);
        res.json(history);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/history', async (req, res) => {
      try {
        const updatedHistory = await analyzeGitHistory(currentRepoPath);
        res.json(updatedHistory);
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.get('/api/file', (req, res) => {
      const { hash, path: filePath } = req.query;
      if (!hash || !filePath) return res.status(400).send('Missing hash or path');
      try {
        const content = execSync(`git -C "${currentRepoPath}" show ${hash}:${filePath}`, { maxBuffer: 10 * 1024 * 1024 }).toString();
        res.json({ content });
      } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve file content (might not exist in this commit or is binary).' });
      }
    });

    app.post('/api/checkout', (req, res) => {
      const { hash } = req.body;
      if (!hash) return res.status(400).send('Missing hash');
      try {
        execSync(`git -C "${currentRepoPath}" checkout ${hash}`);
        res.json({ success: true, message: `Checked out ${hash}` });
      } catch (error) {
        res.status(500).json({ error: 'Failed to checkout commit. Make sure your working tree is clean.' });
      }
    });

    app.post('/api/log', (req, res) => {
      const { message } = req.body;
      fs.appendFileSync(path.join(process.cwd(), 'client.log'), message + '\n\n');
      res.json({ success: true });
    });

    let currentWatcher: fs.FSWatcher | null = null;
    
    app.get('/api/watch', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const setupWatcher = (targetPath: string) => {
        if (currentWatcher) currentWatcher.close();
        const headPath = path.join(targetPath, '.git', 'logs', 'HEAD');
        if (fs.existsSync(headPath)) {
          currentWatcher = fs.watch(headPath, (eventType) => {
            if (eventType === 'change') {
              res.write('data: update\\n\\n');
            }
          });
        }
      };
      
      setupWatcher(currentRepoPath);

      req.on('close', () => {
        if (currentWatcher) currentWatcher.close();
      });
    });

    app.listen(options.port, () => {
      console.log(`RepoRewind visualizer is running on http://localhost:${options.port}`);
    });
  });

program.parse();
