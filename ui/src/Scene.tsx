import React, { useRef, useEffect, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';

interface SceneProps {
  data: any;
}

export const Scene: React.FC<SceneProps> = ({ data }) => {
  const fgRef = useRef<any>();

  useEffect(() => {
    // Add cool rotation effect
    let angle = 0;
    const interval = setInterval(() => {
      if (fgRef.current) {
        angle += Math.PI / 300;
        fgRef.current.cameraPosition({
          x: 200 * Math.cos(angle),
          z: 200 * Math.sin(angle)
        });
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <ForceGraph3D
        ref={fgRef}
        graphData={data}
        nodeLabel="id"
        nodeAutoColorBy="group"
        linkDirectionalParticles={4}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.01}
        backgroundColor="#000000"
        nodeThreeObject={(node: any) => {
          const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ color: node.color || '#00ffcc' })
          );
          sprite.scale.set(4, 4, 1);
          return sprite;
        }}
        linkColor={() => 'rgba(255,255,255,0.2)'}
      />
    </>
  );
};
