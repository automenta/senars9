import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { forceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force';
import { useGraphics } from './GraphicsEngine';

const ConceptMap = ({ concepts }) => {
  const { scene } = useGraphics();
  const graphObjects = useRef(new Map()); // To keep track of Three.js objects
  const simulation = useRef();

  useEffect(() => {
    if (!scene || !concepts) return;

    // --- Data Preparation ---
    const nodes = concepts.map((c, i) => ({ id: c.data?.id || `concept-${i}`, ...c.data }));

    // Simple link logic: connect each node to the next one for visualization
    const links = [];
    for (let i = 0; i < nodes.length - 1; i++) {
        links.push({ source: nodes[i].id, target: nodes[i+1].id });
    }

    // --- Cleanup from previous render ---
    graphObjects.current.forEach((obj, id) => {
        scene.remove(obj);
        if(obj.geometry) obj.geometry.dispose();
        if(obj.material) obj.material.dispose();
    });
    graphObjects.current.clear();
    if(simulation.current) simulation.current.stop();

    // --- Create Three.js objects ---
    // Create nodes (spheres)
    nodes.forEach(node => {
      const geometry = new THREE.SphereGeometry(1, 16, 16);
      const material = new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.userData = node; // Attach data
      scene.add(sphere);
      graphObjects.current.set(node.id, sphere);
    });

    // Create links (lines)
    links.forEach(link => {
        const material = new THREE.LineBasicMaterial({ color: 0xcccccc });
        const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        const line = new THREE.Line(geometry, material);
        line.userData = link; // Attach data
        scene.add(line);
        graphObjects.current.set(`${link.source}-${link.target}`, line);
    });


    // --- D3 Force Simulation ---
    simulation.current = forceSimulation(nodes)
      .force("link", forceLink(links).id(d => d.id).distance(10))
      .force("charge", forceManyBody().strength(-50))
      .force("center", forceCenter(0, 0));

    // --- Animation Tick ---
    simulation.current.on("tick", () => {
      // Update node positions
      nodes.forEach(node => {
        const nodeMesh = graphObjects.current.get(node.id);
        if (nodeMesh) {
          nodeMesh.position.set(node.x, node.y, 0);
        }
      });

      // Update link positions
      links.forEach(link => {
        const lineMesh = graphObjects.current.get(`${link.source.id}-${link.target.id}`);
        const sourceNode = graphObjects.current.get(link.source.id);
        const targetNode = graphObjects.current.get(link.target.id);

        if (lineMesh && sourceNode && targetNode) {
          const positions = lineMesh.geometry.attributes.position;
          positions.setXYZ(0, sourceNode.position.x, sourceNode.position.y, 0);
          positions.setXYZ(1, targetNode.position.x, targetNode.position.y, 0);
          positions.needsUpdate = true;
        }
      });
    });

    // --- Cleanup function ---
    return () => {
        if(simulation.current) simulation.current.stop();
        graphObjects.current.forEach((obj) => scene.remove(obj));
        graphObjects.current.clear();
    };

  }, [concepts, scene]);


  // The GraphicsEngine handles the rendering, so this component just manages objects.
  return null;
};

export default ConceptMap;
