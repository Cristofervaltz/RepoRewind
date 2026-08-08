import { useState, useEffect, useMemo, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { Scene } from './Scene';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, FastForward, Rewind, X, Folder, FileCode, FolderOpen, ChevronRight, Github, Info } from 'lucide-react';
import { useWebLLM } from './hooks/useWebLLM';
import './index.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, errorMsg: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `React Error: ${error.message}\nStack: ${error.stack}\nComponent Stack: ${errorInfo.componentStack}` })
    });
  }

  render() {
    if (this.state.hasError) {
      return <div style={{ color: 'red', padding: '20px' }}>Something went wrong. Check client.log</div>;
    }
    return this.props.children;
  }
}

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
  const [story, setStory] = useState('');
  const { progressText, isGenerating, generateStory } = useWebLLM();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  
  // Landing state
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [tab, setTab] = useState<'local' | 'github'>('local');
  const [inputPath, setInputPath] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [repoName, setRepoName] = useState('Repository');
  const [showLegend, setShowLegend] = useState(true);

  // New States for Tree Interaction
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set());
  const [hoverNode, setHoverNode] = useState<any>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Persistent cache of node and link objects so react-force-graph-3d preserves physics state
  const graphNodesCache = useRef(new Map<string, any>());
  const graphLinksCache = useRef(new Map<string, any>());

  // UI Modal State
  const [checkoutConfirm, setCheckoutConfirm] = useState<{hash: string} | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<string | null>(null);

  // Track mouse globally for the tooltip
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    
    const handleGlobalError = (event: ErrorEvent) => {
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Global Error: ${event.message}\nStack: ${event.error?.stack}` })
      });
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Unhandled Promise: ${event.reason?.stack || event.reason}` })
      });
    };
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const loadHistoryData = (data: any) => {
    if (data.commits && data.commits.length > 0) {
      setCommits(data.commits);
      setCurrentCommitIdx(data.commits.length - 1);
      if (data.repoName) setRepoName(data.repoName);
      setIsAnalyzed(true);
    } else {
      alert("No commits found or invalid repository");
    }
  };

  useEffect(() => {
    // Only try to fetch initial history ONCE on mount.
    // Do NOT depend on isAnalyzed, otherwise clicking "close" will instantly re-fetch and re-open.
    fetch('/api/history')
      .then(res => res.json())
      .then(data => {
        if (!data.error && data.commits && data.commits.length > 0) {
          loadHistoryData(data);
        }
      })
      .catch(() => {}); // ignore, user will use landing page
  }, []);

  useEffect(() => {
    const eventSource = new EventSource('/api/watch');
    eventSource.onmessage = () => {
      // Only auto-update if we are currently looking at a repo
      if (isAnalyzed) {
        fetch('/api/history').then(res => res.json()).then(data => {
          if (!data.error) {
             if (data.commits && data.commits.length > 0) {
                setCommits(data.commits);
                // Don't change currentCommitIdx if they are playing, just update data
             }
          }
        });
      }
    };
    return () => eventSource.close();
  }, [isAnalyzed]);

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

  const handleBrowse = async () => {
    try {
      const res = await fetch('/api/browse');
      const data = await res.json();
      if (data.path) {
        setInputPath(data.path);
      }
    } catch (e) {
      console.error("Browse failed", e);
    }
  };

  const handleAnalyzeLocal = async () => {
    if (!inputPath) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: inputPath })
      });
      const data = await res.json();
      if (data.error) {
        alert("Error: " + data.error);
      } else {
        loadHistoryData(data);
      }
    } catch (e) {
      alert("Failed to analyze repository");
    }
    setIsAnalyzing(false);
  };

  const handleAnalyzeGithub = async () => {
    if (!githubUrl) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: githubUrl })
      });
      const data = await res.json();
      if (data.error) {
        alert("Error: " + data.error);
      } else {
        loadHistoryData(data);
      }
    } catch (e) {
      alert("Failed to clone or analyze repository. Make sure the repository is public and git is installed.");
    }
    setIsAnalyzing(false);
  };

  const graphData = useMemo(() => {
    if (commits.length === 0) return { nodes: [], links: [] };

    const activeFiles = new Set<string>();
    
    for (let i = 0; i <= currentCommitIdx; i++) {
      for (const change of commits[i].changes) {
        if (change.status === 'D') activeFiles.delete(change.path);
        else activeFiles.add(change.path);
      }
    }

    const allNodesMap = new Map<string, any>();
    const allLinks: any[] = [];
    const parentMap = new Map<string, string>(); // child id -> parent id

    allNodesMap.set('ROOT', { id: 'ROOT', name: repoName, group: 1 });

    activeFiles.forEach(filepath => {
      const parts = filepath.split('/');
      let currentPath = '';

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        const prevPath = currentPath || 'ROOT';
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!allNodesMap.has(currentPath)) {
          allNodesMap.set(currentPath, {
            id: currentPath,
            name: part,
            group: isFile ? 2 : 1,
          });
          allLinks.push({ source: prevPath, target: currentPath });
          parentMap.set(currentPath, prevPath);
        }
      });
    });

    const visibleNodes: any[] = [];
    const visibleLinks: any[] = [];
    
    const isVisible = (nodeId: string) => {
      if (nodeId === 'ROOT') return true;
      if (collapsedDirs.has('ROOT')) return false;
      let path = '';
      const parts = nodeId.split('/');
      for (let i = 0; i < parts.length - 1; i++) {
        path = path ? `${path}/${parts[i]}` : parts[i];
        if (collapsedDirs.has(path)) return false;
      }
      return true;
    };

    const isMatched = (nodeId: string, nodeName: string): boolean => {
      if (!searchQuery) return true;
      const lowerQuery = searchQuery.toLowerCase();
      if (nodeName.toLowerCase().includes(lowerQuery)) return true;
      // Match if any child node matches (for folders)
      for (const key of allNodesMap.keys()) {
        if (key.startsWith(nodeId + '/') && key.toLowerCase().includes(lowerQuery)) {
          return true;
        }
      }
      return false;
    };

    const nodeCache = graphNodesCache.current;
    const linkCache = graphLinksCache.current;

    allNodesMap.forEach((node, id) => {
      if (isVisible(id)) {
        let graphNode = nodeCache.get(id);

        if (!graphNode) {
          // Creating this node object for the first time
          graphNode = { ...node };

          // Seed NEW nodes at their parent's current simulation position
          // so they physically grow out from the parent instead of teleporting.
          const parentId = parentMap.get(id);
          const parentNode = parentId ? nodeCache.get(parentId) : null;
          if (parentNode && parentNode.x != null) {
            graphNode.x = parentNode.x + (Math.random() - 0.5) * 8;
            graphNode.y = parentNode.y + (Math.random() - 0.5) * 8;
            graphNode.z = parentNode.z + (Math.random() - 0.5) * 8;
          }
          nodeCache.set(id, graphNode);
        }

        // Update properties that might have changed
        graphNode.isCollapsed = collapsedDirs.has(id);
        graphNode.isFaded = !isMatched(id, node.name);
        
        visibleNodes.push(graphNode);
      }
    });

    allLinks.forEach(link => {
      if (isVisible(link.source) && isVisible(link.target)) {
        const linkId = `${link.source}->${link.target}`;
        let graphLink = linkCache.get(linkId);
        if (!graphLink) {
          graphLink = { ...link };
          linkCache.set(linkId, graphLink);
        }
        visibleLinks.push(graphLink);
      }
    });

    return { nodes: visibleNodes, links: visibleLinks };
  }, [commits, currentCommitIdx, collapsedDirs, repoName]);

  const currentCommit = commits[currentCommitIdx];

  const handleNodeClick = (node: any) => {
    if (!currentCommit) return;
    
    if (node.group === 1) {
      setCollapsedDirs(prev => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    } else if (node.group === 2) {
      setSelectedFile(node.id);
      setFileContent('Loading...');
      fetch(`/api/file?hash=${currentCommit.hash}&path=${node.id}`)
        .then(res => res.json())
        .then(data => setFileContent(data.content || data.error))
        .catch(() => setFileContent('Failed to load file.'));
    }
  };

  const handleCheckout = () => {
    if (!currentCommit) return;
    setCheckoutConfirm({ hash: currentCommit.hash });
  };

  const executeCheckout = () => {
    if (!checkoutConfirm) return;
    const targetHash = checkoutConfirm.hash;
    setCheckoutConfirm(null);
    
    fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash: targetHash })
    })
      .then(res => res.json())
      .then(data => setCheckoutResult(data.error || data.message))
      .catch(err => setCheckoutResult('Network error while checking out.'));
  };

  if (!isAnalyzed) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '24px' }}>
        <h1 className="brand-title" style={{ fontSize: '3rem', marginBottom: '0' }}>RepoRewind</h1>
        <p className="text-muted" style={{ fontSize: '1.2rem', maxWidth: '400px', textAlign: 'center', marginBottom: '20px' }}>
          Explore your Git history in 3D space. Select a repository to begin.
        </p>
        
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '0', width: '500px', overflow: 'hidden' }}>
          
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-glass-border)' }}>
            <button 
              style={{ flex: 1, padding: '16px', background: tab === 'local' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', color: tab === 'local' ? 'white' : 'var(--color-neutral-400)', fontWeight: tab === 'local' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => setTab('local')}
            >
              <FolderOpen size={18} />
              Local Folder
            </button>
            <button 
              style={{ flex: 1, padding: '16px', background: tab === 'github' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', color: tab === 'github' ? 'white' : 'var(--color-neutral-400)', fontWeight: tab === 'github' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => setTab('github')}
            >
              <Github size={18} />
              GitHub
            </button>
          </div>

          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {tab === 'local' ? (
              <>
                <label style={{ fontSize: '0.9rem', color: 'var(--color-neutral-300)' }}>Repository Path</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={inputPath}
                    onChange={(e) => setInputPath(e.target.value)}
                    placeholder="e.g. C:\Projects\MyRepo"
                    style={{ flex: 1, padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-glass-border)', borderRadius: '8px', color: 'white', fontFamily: 'monospace' }}
                  />
                  <button className="btn btn-primary" onClick={handleBrowse} title="Browse for folder">
                    <FolderOpen size={20} />
                  </button>
                </div>
                
                <button 
                  className="btn btn-primary" 
                  onClick={handleAnalyzeLocal} 
                  disabled={!inputPath || isAnalyzing}
                  style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '8px', padding: '14px' }}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Launch Visualizer'}
                  {!isAnalyzing && <ChevronRight size={20} />}
                </button>
              </>
            ) : (
              <>
                <label style={{ fontSize: '0.9rem', color: 'var(--color-neutral-300)' }}>GitHub Repository URL or Slug</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="e.g. facebook/react"
                    style={{ flex: 1, padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-glass-border)', borderRadius: '8px', color: 'white', fontFamily: 'monospace' }}
                  />
                </div>
                
                <button 
                  className="btn btn-primary" 
                  onClick={handleAnalyzeGithub} 
                  disabled={!githubUrl || isAnalyzing}
                  style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '8px', padding: '14px' }}
                >
                  {isAnalyzing ? 'Cloning & Analyzing (This might take a minute)...' : 'Clone & Analyze'}
                  {!isAnalyzing && <ChevronRight size={20} />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <ErrorBoundary>
        <Scene 
          data={graphData} 
          onNodeClick={handleNodeClick} 
          onNodeHover={setHoverNode}
        />
        
        {/* Checkout Modals */}
        {checkoutConfirm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>⚠️ Time-Travel Warning</h3>
              <p>This will execute <code>git checkout {checkoutConfirm.hash.substring(0, 7)}</code> on your local machine.</p>
              <p>All physical files in this repository will be rolled back to this exact moment in history.</p>
              <div className="modal-actions">
                <button className="btn" onClick={() => setCheckoutConfirm(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={executeCheckout}>Proceed</button>
              </div>
            </div>
          </div>
        )}

        {checkoutResult && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Git Checkout Result</h3>
              <p>{checkoutResult}</p>
              <div className="modal-actions">
                <button className="btn btn-primary" onClick={() => setCheckoutResult(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </ErrorBoundary>
      
      {/* Dynamic Hover Tooltip */}
      <AnimatePresence>
        {hoverNode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="hover-tooltip glass-panel"
            style={{
              position: 'absolute',
              top: mousePos.y + 20,
              left: mousePos.x + 20,
              pointerEvents: 'none',
              padding: '12px 16px',
              zIndex: 100,
              width: '300px',
              gap: '8px'
            }}
          >
            <div className="flex-row" style={{ gap: '8px' }}>
              {hoverNode.group === 1 ? <Folder size={18} color="#b200ff" /> : <FileCode size={18} color="#00ffcc" />}
              <span style={{ fontWeight: 600, wordBreak: 'break-all' }}>{hoverNode.name}</span>
            </div>
            <div className="text-xs" style={{ color: 'var(--color-neutral-300)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
              {hoverNode.id === 'ROOT' ? '/' : hoverNode.id}
            </div>
            <div style={{ marginTop: '4px', padding: '6px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>🖱️</span>
              <span className="text-xs" style={{ color: '#fff', fontWeight: 500 }}>
                {hoverNode.group === 1
                  ? (hoverNode.isCollapsed ? 'Click to expand folder' : 'Click to collapse folder')
                  : 'Click to view file contents'
                }
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <AnimatePresence>
        {showLegend && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.5 }}
            className="glass-panel"
            style={{
              position: 'absolute',
              top: 'var(--space-4)',
              right: 'var(--space-4)',
              zIndex: 10,
              padding: '16px 20px',
              width: '220px',
              gap: '12px',
            }}
          >
            <div className="flex-between">
              <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>Legend</span>
              <button className="btn-icon" onClick={() => setShowLegend(false)} style={{ width: '24px', height: '24px' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffc832', boxShadow: '0 0 8px #ffc832' }} />
                <span className="text-xs">Root (repo name)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#b200ff', boxShadow: '0 0 8px #b200ff' }} />
                <span className="text-xs">Folder — click to collapse</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff6432', boxShadow: '0 0 8px #ff6432' }} />
                <span className="text-xs">Collapsed folder</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#00ffcc', boxShadow: '0 0 8px #00ffcc' }} />
                <span className="text-xs">File — click to view</span>
              </div>
            </div>
            <div className="text-xs text-muted" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px', lineHeight: '1.5' }}>
              🖱️ Drag to rotate • Scroll to zoom
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend toggle when hidden */}
      {!showLegend && (
        <button
          className="btn-icon"
          onClick={() => setShowLegend(true)}
          style={{
            position: 'absolute',
            top: 'var(--space-4)',
            right: 'var(--space-4)',
            zIndex: 10,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
          title="Show legend"
        >
          <Info size={18} />
        </button>
      )}

      {/* Left Info Panel */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="glass-panel panel-left"
        style={{ width: selectedFile ? '500px' : '380px' }}
      >
        <div className="flex-between">
          <h1 className="brand-title" style={{ fontSize: '1.5rem', marginBottom: 0 }}>RepoRewind</h1>
          <button className="btn-icon" onClick={() => { setIsAnalyzed(false); }} title="Select a different repository">
            <FolderOpen size={18} />
          </button>
        </div>
        
        <div style={{ marginTop: '16px' }}>
          <input 
            type="text" 
            placeholder="Search files or folders..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--color-glass-border)',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-neutral-0)',
              outline: 'none',
              marginBottom: '16px',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
            }}
          />
        </div>

        <div style={{ marginTop: '8px' }}>
          {selectedFile ? (
            <div>
              <div className="flex-between">
                <h3 className="heading-2" style={{ wordBreak: 'break-all', fontSize: '1rem', color: 'var(--color-primary-500)' }}>
                  {selectedFile}
                </h3>
                <button className="btn-icon" onClick={() => setSelectedFile(null)}>
                  <X size={20} />
                </button>
              </div>
              <div className="code-viewer">
                <pre>{fileContent}</pre>
              </div>
            </div>
          ) : currentCommit ? (
            <>
              <div className="badge">{new Date(currentCommit.date).toLocaleDateString()}</div>
              <h2 className="heading-2">{currentCommit.message.split('\n')[0]}</h2>
              
              <div className="flex-between text-mono text-muted" style={{ borderTop: '1px solid var(--color-glass-border)', paddingTop: '16px' }}>
                <span style={{ color: 'var(--color-primary-500)' }}>#{currentCommit.hash.substring(0, 7)}</span>
                <span>{currentCommit.author}</span>
              </div>
              
              <button className="btn btn-primary" onClick={handleCheckout}>
                ⏱ Time-Travel to this Era
              </button>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-100)', marginTop: '4px', textAlign: 'center' }}>
                Updates your physical files using git checkout
              </div>
              
              <details>
                <summary>✨ AI Lore Generator</summary>
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button 
                    className="btn btn-primary"
                    onClick={() => generateStory(commits.slice(0, currentCommitIdx + 1), setStory)}
                    disabled={isGenerating}
                  >
                    {isGenerating ? 'Generating Story...' : 'Generate Story'}
                  </button>
                  
                  {progressText && <div className="text-muted" style={{ color: 'var(--color-primary-500)' }}>{progressText}</div>}
                  
                  {story && (
                    <div className="text-muted" style={{ 
                      padding: '12px', 
                      background: 'var(--color-neutral-900)', 
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '2px solid var(--color-primary-500)',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {story}
                    </div>
                  )}
                </div>
              </details>
            </>
          ) : (
            <p className="text-muted">Loading timeline...</p>
          )}
        </div>
      </motion.div>

      {/* Bottom Timeline Panel */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="glass-panel panel-bottom flex-row"
      >
        <div className="flex-row">
          <button className="btn-icon" onClick={() => setCurrentCommitIdx(0)}><Rewind size={20} /></button>
          <button className="btn-icon active" onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button className="btn-icon" onClick={() => setCurrentCommitIdx(commits.length - 1)}><FastForward size={20} /></button>
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
