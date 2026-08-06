import { useRef } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';

interface SceneProps {
  data: any;
  onNodeClick?: (node: any) => void;
  onNodeHover?: (node: any | null) => void;
}

// Generate a glowing circle texture using Canvas API to avoid THREE.Mesh renderer bugs
const generateSpriteMaterial = (colorStr: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  
  // Create radial gradient for a glowing sphere effect
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, colorStr.replace(')', ', 0.8)').replace('rgb', 'rgba')); 
  gradient.addColorStop(0.7, colorStr.replace(')', ', 0.2)').replace('rgb', 'rgba')); 
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  
  const texture = new THREE.CanvasTexture(canvas);
  return new THREE.SpriteMaterial({ map: texture, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending });
};

const materialCache: Record<string, THREE.SpriteMaterial> = {
  folder: generateSpriteMaterial('rgb(178, 0, 255)'),
  file: generateSpriteMaterial('rgb(0, 255, 204)')
};

export const Scene: React.FC<SceneProps> = ({ data, onNodeClick, onNodeHover }) => {
  const fgRef = useRef<any>();

  // Auto-rotation removed to allow user to freely rotate the 3D space

  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={data}
      nodeLabel=""
      backgroundColor="rgba(0,0,0,0)"
      // Removed dagMode to allow natural 3D organic clustering like Obsidian
      d3AlphaDecay={0.02} // Let it settle smoothly
      d3VelocityDecay={0.3}
      nodeThreeObject={(node: any) => {
        const isDir = node.group === 1;
        const material = isDir ? materialCache.folder : materialCache.file;
        const sprite = new THREE.Sprite(material);
        // Make folders much larger to establish hierarchy
        const size = isDir ? 24 : 12;
        sprite.scale.set(size, size, 1);
        return sprite;
      }}
      linkWidth={1.5}
      linkColor={() => 'rgba(0, 255, 204, 0.4)'} // Brighter neon links
      linkDirectionalParticles={2}
      linkDirectionalParticleWidth={2}
      linkDirectionalParticleSpeed={0.005}
      linkDirectionalParticleColor={() => 'rgba(178, 0, 255, 0.8)'}
      onNodeClick={onNodeClick}
      onNodeHover={onNodeHover}
      enableNodeDrag={true} // Enabled dragging for better interactivity
      onEngineStop={() => {
        // Gently zoom to fit the whole tree once physics settle
        if (fgRef.current) {
          fgRef.current.zoomToFit(1000, 50, () => true);
        }
      }}
    />
  );
};
