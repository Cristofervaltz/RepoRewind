import React, { useState, useEffect, useMemo } from 'react';
import { Scene } from './Scene';
import { motion } from 'framer-motion';
import { Play, Pause, FastForward, Rewind } from 'lucide-react';
import './index.css';

interface FileChange {
  status: string;
  path: string;
}

interface Commit {
  hash: string;
  author: string;
  date: string;
  message: string;
  changes: FileChange[];
}

const App = () => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [currentCommitIdx, setCurrentCommitIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    fetch('/api/history')
      .then(res => res.json())
      .then(data => {
        if (data.commits && data.commits.length > 0) {
          setCommits(data.commits);
          setCurrentCommitIdx(data.commits.length - 1);
        }
      })
      .catch(err => console.error("Failed to fetch history:", err));
  }, []);

  useEffect(() => {
    let interval: any;
    if (isPlaying && currentCommitIdx < commits.length - 1) {
      interval = setInterval(() => {
        setCurrentCommitIdx(prev => Math.min(prev + 1, commits.length - 1));
      }, 1000);
    } else if (currentCommitIdx >= commits.length - 1) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentCommitIdx, commits.length]);

  // "Time Machine" algorithm: Compute the graph up to currentCommitIdx
  const graphData = useMemo(() => {
    if (commits.length === 0) return { nodes: [], links: [] };

    const activeFiles = new Set<string>();
    
    // Play history up to current commit
    for (let i = 0; i <= currentCommitIdx; i++) {
      for (const change of commits[i].changes) {
        if (change.status === 'D') {
          activeFiles.delete(change.path);
        } else {
          activeFiles.add(change.path);
        }
      }
    }

    const nodes: any[] = [];
    const links: any[] = [];
    const addedDirs = new Set<string>();

    activeFiles.forEach(filepath => {
      const parts = filepath.split('/');
      let currentPath = '';

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        const prevPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!addedDirs.has(currentPath)) {
          addedDirs.add(currentPath);
          nodes.push({
            id: currentPath,
            name: part,
            group: isFile ? 2 : 1, // 1 for dir, 2 for file
            color: isFile ? '#00ffcc' : '#b200ff'
          });

          if (prevPath) {
            links.push({
              source: prevPath,
              target: currentPath
            });
          }
        }
      });
    });

    return { nodes, links };
  }, [commits, currentCommitIdx]);

  const currentCommit = commits[currentCommitIdx];

  return (
    <div className="app-container">
      <Scene data={graphData} />
      
      {/* Story Panel */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="story-panel glass"
      >
        <h1 className="title">RepoRewind</h1>
        {currentCommit ? (
          <>
            <div className="era-badge">Date: {new Date(currentCommit.date).toLocaleDateString()}</div>
            <h2 className="subtitle">{currentCommit.message.split('\n')[0]}</h2>
            <p className="description">
              Files changed: {currentCommit.changes.length}. This commit shaped the structure you see right now. 
              (AI Summary will be generated here).
            </p>
            <div className="commit-info">
              <span className="hash">#{currentCommit.hash.substring(0, 7)}</span>
              <span className="author">{currentCommit.author}</span>
            </div>
          </>
        ) : (
          <p>Loading timeline...</p>
        )}
      </motion.div>

      {/* Timeline Controls */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="timeline-panel glass"
      >
        <div className="controls">
          <button className="icon-btn" onClick={() => setCurrentCommitIdx(0)}><Rewind size={20} /></button>
          <button className="icon-btn primary" onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <button className="icon-btn" onClick={() => setCurrentCommitIdx(commits.length - 1)}><FastForward size={20} /></button>
        </div>
        <div className="slider-container">
          <input 
            type="range" 
            min="0" 
            max={Math.max(0, commits.length - 1)} 
            value={currentCommitIdx}
            onChange={(e) => {
              setCurrentCommitIdx(Number(e.target.value));
              setIsPlaying(false);
            }}
            className="timeline-slider"
          />
          <div className="timeline-labels">
            <span>{commits.length > 0 ? new Date(commits[0].date).toLocaleDateString() : 'Start'}</span>
            <span>{commits.length > 0 ? new Date(commits[commits.length - 1].date).toLocaleDateString() : 'Today'}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default App;
