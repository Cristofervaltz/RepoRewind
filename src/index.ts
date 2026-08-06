import { Command } from 'commander';
import { analyzeGitHistory } from './gitAnalyzer';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

const program = new Command();

program
  .name('reporewind')
  .description('3D Git History Visualizer CLI')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze a local git repository and launch the visualizer')
  .argument('<path>', 'Path to the git repository')
  .option('-p, --port <number>', 'Port for the local web server', '3000')
  .action(async (repoPath, options) => {
    console.log(`Analyzing repository at ${repoPath}...`);
    
    try {
      const history = await analyzeGitHistory(repoPath);
      console.log(`Analyzed ${history.commits.length} commits.`);

      const app = express();
      app.use(cors());

      // Serve UI build if it exists
      const uiPath = path.join(__dirname, '../../ui/dist');
      if (fs.existsSync(uiPath)) {
        app.use(express.static(uiPath));
      }

      app.get('/api/history', (req, res) => {
        res.json(history);
      });

      app.listen(options.port, () => {
        console.log(`RepoRewind visualizer is running on http://localhost:${options.port}`);
      });
      
    } catch (error: any) {
      console.error(`Failed to analyze repository: ${error.message}`);
    }
  });

program.parse();
