import React, { useState, useEffect } from 'react';
import { Scene } from './Scene';
import { motion } from 'framer-motion';
import { Play, Pause, FastForward, Rewind } from 'lucide-react';
import './index.css';

const App = () => {
  const [history, setHistory] = useState<any>(null);
  const [currentCommitIdx, setCurrentCommitIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Mock data for now until API is connected
  const mockData = {
    nodes: [{ id: 'src', group: 1 }, { id: 'main.tsx', group: 2 }, { id: 'App.tsx', group: 2 }, { id: 'api', group: 1 }, { id: 'server.ts', group: 3 }],
    links: [
      { source: 'src', target: 'main.tsx' },
      { source: 'src', target: 'App.tsx' },
      { source: 'api', target: 'server.ts' },
      { source: 'src', target: 'api' }
    ]
  };

  useEffect(() => {
    // In reality, fetch from localhost:3000/api/history
    setHistory({ commits: [] });
  }, []);

  return (
    <div className="app-container">
      <Scene data={mockData} />
      
      {/* Story Panel */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="story-panel glass"
      >
        <h1 className="title">RepoRewind</h1>
        <div className="era-badge">Era: Initialization</div>
        <h2 className="subtitle">The Genesis Commit</h2>
        <p className="description">
          This era marks the beginning of the repository. The core architecture was established with the introduction of the main entry points and basic routing structures.
        </p>
        <div className="commit-info">
          <span className="hash">#a1b2c3d</span>
          <span className="author">Cristofervaltz</span>
        </div>
      </motion.div>

      {/* Timeline Controls */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="timeline-panel glass"
      >
        <div className="controls">
          <button className="icon-btn"><Rewind size={20} /></button>
          <button className="icon-btn primary" onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <button className="icon-btn"><FastForward size={20} /></button>
        </div>
        <div className="slider-container">
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={currentCommitIdx}
            onChange={(e) => setCurrentCommitIdx(Number(e.target.value))}
            className="timeline-slider"
          />
          <div className="timeline-labels">
            <span>Aug 2023</span>
            <span>Today</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default App;
