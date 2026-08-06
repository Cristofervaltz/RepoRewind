import { useRef, useCallback, useEffect, MutableRefObject } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';

interface SceneProps {
  data: any;
  onNodeClick?: (node: any) => void;
  onNodeHover?: (node: any | null) => void;
  positionsRef: MutableRefObject<Map<string, { x: number; y: number; z: number }>>;
}

// Generate a glowing circle texture using Canvas API
const generateGlowTexture = (color: [number, number, number]) => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`);
  gradient.addColorStop(0.4, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.6)`);
  gradient.addColorStop(0.7, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.15)`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
};

// Pre-generate textures (shared across all nodes)
const folderTexture = generateGlowTexture([178, 0, 255]);
const fileTexture = generateGlowTexture([0, 255, 204]);
const rootTexture = generateGlowTexture([255, 200, 50]);
const collapsedTexture = generateGlowTexture([255, 100, 50]);

// Shared materials (reused to prevent GPU memory leaks)
const sharedMaterials = {
  root: new THREE.SpriteMaterial({ map: rootTexture, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  folder: new THREE.SpriteMaterial({ map: folderTexture, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  collapsed: new THREE.SpriteMaterial({ map: collapsedTexture, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  file: new THREE.SpriteMaterial({ map: fileTexture, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
};

export const Scene: React.FC<SceneProps> = ({ data, onNodeClick, onNodeHover, positionsRef }) => {
  const fgRef = useRef<any>();
  const hasZoomedRef = useRef(false);

  // Reset zoom flag when data changes drastically (new repo loaded)
  const prevNodeCountRef = useRef(0);
  useEffect(() => {
    const nodeCount = data?.nodes?.length || 0;
    if (prevNodeCountRef.current > 0 && Math.abs(nodeCount - prevNodeCountRef.current) / prevNodeCountRef.current > 0.5) {
      hasZoomedRef.current = false;
    }
    prevNodeCountRef.current = nodeCount;
  }, [data]);

  const createNodeObject = useCallback((node: any) => {
    const isRoot = node.id === 'ROOT';
    const isDir = node.group === 1;
    const isCollapsed = node.isCollapsed;

    const group = new THREE.Group();

    // Pick shared material and size
    let material: THREE.SpriteMaterial;
    let glowSize: number;

    if (isRoot) {
      material = sharedMaterials.root;
      glowSize = 28;
    } else if (isCollapsed) {
      material = sharedMaterials.collapsed;
      glowSize = 20;
    } else if (isDir) {
      material = sharedMaterials.folder;
      glowSize = 18;
    } else {
      material = sharedMaterials.file;
      glowSize = 10;
    }

    const glow = new THREE.Sprite(material);
    glow.scale.set(glowSize, glowSize, 1);
    group.add(glow);

    // Text label
    const label = new SpriteText(node.name);
    label.color = isRoot ? '#ffc832' : isDir ? '#d4a0ff' : '#a0f0e0';
    label.textHeight = isRoot ? 6 : isDir ? 4.5 : 3.5;
    label.fontFace = 'Inter, system-ui, sans-serif';
    label.fontWeight = isRoot || isDir ? '600' : '400';
    label.backgroundColor = 'rgba(0,0,0,0.55)';
    label.padding = 1.5;
    label.borderRadius = 3;
    label.position.set(0, -(glowSize / 2 + 3), 0);
    group.add(label);

    // Collapsed indicator
    if (isCollapsed) {
      const hint = new SpriteText('▶ collapsed');
      hint.color = '#ff8855';
      hint.textHeight = 2.5;
      hint.fontFace = 'Inter, system-ui, sans-serif';
      hint.backgroundColor = 'rgba(0,0,0,0.5)';
      hint.padding = 1;
      hint.borderRadius = 2;
      hint.position.set(0, -(glowSize / 2 + 7), 0);
      group.add(hint);
    }

    return group;
  }, []);

  // Track all node positions on each physics tick so App can seed new nodes at parent positions.
  // We read from the data prop's nodes directly — ForceGraph mutates x/y/z on these objects in place.
  const handleEngineTick = useCallback(() => {
    const nodes = data?.nodes;
    if (nodes) {
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.x != null) {
          positionsRef.current.set(n.id, { x: n.x, y: n.y, z: n.z });
        }
      }
    }
  }, [data, positionsRef]);

  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={data}
      nodeLabel=""
      backgroundColor="rgba(0,0,0,0)"
      // Physics: settle quickly but not instantly — allows smooth branch growing
      d3AlphaDecay={0.06}
      d3VelocityDecay={0.5}
      warmupTicks={20}
      nodeThreeObject={createNodeObject}
      nodeThreeObjectExtend={false}
      // Links with animated particles
      linkWidth={1.5}
      linkOpacity={0.35}
      linkColor={() => 'rgba(0, 255, 204, 0.35)'}
      linkDirectionalParticles={1}
      linkDirectionalParticleWidth={1.5}
      linkDirectionalParticleSpeed={0.004}
      linkDirectionalParticleColor={() => 'rgba(178, 0, 255, 0.7)'}
      onNodeClick={onNodeClick}
      onNodeHover={onNodeHover}
      enableNodeDrag={true}
      onEngineTick={handleEngineTick}
      onEngineStop={() => {
        // Auto-zoom only on first load
        if (fgRef.current && !hasZoomedRef.current) {
          hasZoomedRef.current = true;
          fgRef.current.zoomToFit(800, 80, () => true);
        }
      }}
    />
  );
};
