import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { forceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force';
import GraphicsEngine, { useGraphics } from './GraphicsEngine';

const ConceptMapContent = ({ concepts }) => {
  const { scene } = useGraphics();
  const graphObjects = useRef(new Map()); // To keep track of Three.js objects
  const simulation = useRef();
  const [isPaused, setIsPaused] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);

  // Process different types of entities and extract relationships
  // Helper function to extract concepts from NARS-style task content
  const extractConceptsFromTask = (content) => {
    if (!content) return [];
    
    // Pattern to match various NARS formats like:
    // (a --> b), <a --> b>, (a & b) --> c, etc.
    // This regex looks for content in parentheses or angle brackets
    const patterns = [
      /\(([^)]*)-->([^)]*)\)/g,  // (a --> b)
      /<([^>]*)-->([^>]*)>/g,    // <a --> b>
    ];
    
    const concepts = [];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        // Extract subject and predicate, split on operators like &, |, etc.
        const subject = match[1].trim();
        const predicate = match[2].trim();
        
        // Further split on logical operators to get individual terms
        subject.split(/[&|]/).map(c => c.trim()).forEach(c => {
          if (c && !concepts.includes(c)) concepts.push(c);
        });
        predicate.split(/[&|]/).map(c => c.trim()).forEach(c => {
          if (c && !concepts.includes(c)) concepts.push(c);
        });
      }
    }
    
    return concepts;
  };
  
  // Process different types of entities and extract relationships
  const processEntities = (concepts) => {
    if (!concepts || concepts.length === 0) return { nodes: [], links: [] };

    const nodes = [];
    const links = [];
    const existingNodes = new Map(); // To avoid duplicate nodes
    const processedTasks = new Set(); // To avoid duplicate processing
    
    // Create nodes for different entity types and extract relationships from tasks
    concepts.forEach((item, i) => {
      const itemType = item.get('type');
      const itemData = item.get('data');
      
      if (itemType === 'concept') {
        const nodeId = itemData?.id || `concept-${i}`;
        if (!existingNodes.has(nodeId)) {
          nodes.push({
            id: nodeId,
            type: 'concept',
            name: itemData?.name || itemData?.id || `Concept-${i}`,
            priority: itemData?.priority || 0.5,
            color: 0x007bff, // Blue
            ...itemData
          });
          existingNodes.set(nodeId, nodes.length - 1);
        }
      }
      else if (itemType === 'task') {
        const taskId = itemData?.id || `task-${i}`;
        if (!existingNodes.has(taskId)) {
          nodes.push({
            id: taskId,
            type: 'task',
            name: itemData?.content || `Task-${i}`,
            priority: itemData?.priority || 0.5,
            color: 0x28a745, // Green
            ...itemData
          });
          existingNodes.set(taskId, nodes.length - 1);
        }
        
        // Extract concept relationships from task content
        // Parse tasks like "(a --> b)." to create relationships
        if (itemData?.content && !processedTasks.has(taskId)) {
          processedTasks.add(taskId);
          
          // Extract concepts from the task content using our helper
          const extractedConcepts = extractConceptsFromTask(itemData.content);
          
          // Create concept nodes for each extracted concept
          extractedConcepts.forEach(concept => {
            if (concept && !existingNodes.has(concept)) {
              nodes.push({
                id: concept,
                type: 'concept-individual',
                name: concept,
                priority: (itemData?.priority || 0.3) + 0.1, // Slightly higher priority
                color: 0x6610f2, // Purple
              });
              existingNodes.set(concept, nodes.length - 1);
            }
            
            // Create links between the task and its concepts
            if (concept && existingNodes.has(concept)) {
              links.push({
                source: taskId,
                target: concept,
                type: 'task-contains',
                strength: itemData?.priority || 0.5
              });
            }
          });
        }
      }
      else if (itemType === 'link') {
        links.push({
          source: itemData?.source || `link-source-${i}`,
          target: itemData?.target || `link-target-${i}`,
          type: itemData?.linkType || 'relation',
          strength: itemData?.strength || 0.5
        });
      }
    });

    return { nodes, links };
  };

  useEffect(() => {
    if (!scene || !concepts) return;

    const { nodes, links } = processEntities(concepts);

    // --- Cleanup from previous render ---
    graphObjects.current.forEach((obj, id) => {
        scene.remove(obj);
        if(obj.geometry) obj.geometry.dispose();
        if(obj.material) obj.material.dispose();
    });
    graphObjects.current.clear();
    if(simulation.current) simulation.current.stop();

    // --- Create Three.js objects ---
    // Create nodes with different geometries based on type
    nodes.forEach(node => {
      let geometry, material;
      
      // Different shapes for different types
      switch(node.type) {
        case 'task':
          geometry = new THREE.ConeGeometry(0.8, 1.5, 8);
          break;
        case 'concept-individual':
          geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
          break;
        case 'concept':
        default:
          geometry = new THREE.SphereGeometry(1, 16, 16);
      }
      
      const priorityFactor = Math.max(0.3, Math.min(1, node.priority || 0.5));
      const baseColor = node.color || 0xcccccc;
      
      material = new THREE.MeshPhongMaterial({ 
        color: baseColor,
        emissive: new THREE.Color(baseColor).multiplyScalar(0.2),
        shininess: 50,
        transparent: true,
        opacity: Math.min(0.9, 0.3 + priorityFactor * 0.7)
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // Add pulsing animation based on priority
      const originalScale = mesh.scale.clone();
      mesh.userData = { 
        node, 
        originalScale,
        animationOffset: Math.random() * Math.PI * 2 // Random phase for animation
      };
      
      scene.add(mesh);
      graphObjects.current.set(node.id, mesh);
    });

    // Create links
    links.forEach(link => {
      const material = new THREE.LineBasicMaterial({ 
        color: 0x888888,
        transparent: true,
        opacity: 0.4 + (link.strength || 0.5) * 0.4
      });
      const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const line = new THREE.Line(geometry, material);
      line.userData = link;
      scene.add(line);
      graphObjects.current.set(`${link.source}-${link.target}`, line);
    });

    // --- D3 Force Simulation ---
    simulation.current = forceSimulation(nodes)
      .force("link", forceLink(links).id(d => d.id).distance(15).strength(0.5))
      .force("charge", forceManyBody().strength(-100))
      .force("center", forceCenter(0, 0));

    // --- Animation Tick ---
    const animate = () => {
      if (isPaused) {
        requestAnimationFrame(animate);
        return;
      }
      
      if(!simulation.current) return;
      simulation.current.alpha(0.1); // Maintain some movement
      simulation.current.tick();
      
      // Update node positions
      nodes.forEach(node => {
        const nodeMesh = graphObjects.current.get(node.id);
        if (nodeMesh) {
          // Animate scale based on priority and time
          const time = Date.now() * 0.001;
          const pulse = Math.sin(time + nodeMesh.userData.animationOffset) * 0.1 + 1;
          nodeMesh.position.set(node.x, node.y, 0);
          nodeMesh.scale.copy(nodeMesh.userData.originalScale).multiplyScalar(pulse);
        }
      });

      // Update link positions
      links.forEach(link => {
        const lineMesh = graphObjects.current.get(`${link.source}-${link.target}`);
        const sourceNode = graphObjects.current.get(link.source);
        const targetNode = graphObjects.current.get(link.target);

        if (lineMesh && sourceNode && targetNode) {
          const positions = lineMesh.geometry.attributes.position;
          positions.setXYZ(0, sourceNode.position.x, sourceNode.position.y, 0);
          positions.setXYZ(1, targetNode.position.x, targetNode.position.y, 0);
          positions.needsUpdate = true;
        }
      });
      
      requestAnimationFrame(animate);
    };
    animate();

    // --- Cleanup function ---
    return () => {
        if(simulation.current) simulation.current.stop();
        graphObjects.current.forEach((obj) => scene.remove(obj));
        graphObjects.current.clear();
    };

  }, [concepts, scene, isPaused]);

  // Add mouse controls for zoom
  useEffect(() => {
    const handleWheel = (event) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      setZoomLevel(prev => Math.max(0.1, Math.min(3, prev * delta)));
    };

    const container = document.querySelector('.concept-map-container');
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, []);

  // Add lighting to the scene
  useEffect(() => {
    if (!scene) return;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Add point light for additional glow
    const pointLight = new THREE.PointLight(0xffffff, 0.6, 100);
    pointLight.position.set(0, 0, 20);
    scene.add(pointLight);
  }, [scene]);

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const resetZoom = () => {
    setZoomLevel(1);
  };

  return (
    <div className="concept-map-container" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '5px 10px',
        backgroundColor: '#e9ecef',
        borderBottom: '1px solid #ccc',
        fontSize: '12px',
        zIndex: 10
      }}>
        <div style={{ fontWeight: 'bold', color: '#333' }}>
          Concept Map
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={togglePause}
            style={{
              padding: '2px 8px',
              fontSize: '12px',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              backgroundColor: isPaused ? '#28a745' : '#6c757d',
              color: 'white'
            }}
          >
            {isPaused ? '▶️ Resume' : '⏸️ Pause'}
          </button>
          <button
            onClick={resetZoom}
            style={{
              padding: '2px 8px',
              fontSize: '12px',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              backgroundColor: '#007bff',
              color: 'white'
            }}
          >
            🔍 Reset Zoom
          </button>
        </div>
      </div>
      
      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '11px',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#007bff', marginRight: '6px' }}></div>
          <span>Concepts</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#28a745', marginRight: '6px' }}></div>
          <span>Tasks</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#6610f2', marginRight: '6px' }}></div>
          <span>Individual Concepts</span>
        </div>
      </div>
      
      {/* The 3D scene is managed by the GraphicsEngine, so we just return a container */}
      <div style={{ 
        flex: 1, 
        cursor: 'grab',
        transform: `scale(${zoomLevel})`,
        transformOrigin: 'center center',
        transition: 'transform 0.2s ease'
      }}>
        {selectedNode && (
          <div style={{
            position: 'absolute',
            top: '50px',
            left: '10px',
            backgroundColor: 'white',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            zIndex: 20,
            maxWidth: '250px',
            fontSize: '12px'
          }}>
            <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>{selectedNode.name}</h4>
            <div><strong>ID:</strong> {selectedNode.id}</div>
            <div><strong>Type:</strong> {selectedNode.type}</div>
            <div><strong>Priority:</strong> {(selectedNode.priority || 0).toFixed(2)}</div>
            {selectedNode.content && <div><strong>Content:</strong> {selectedNode.content}</div>}
            {/* Add other concept details here as they become available */}
          </div>
        )}
      </div>
    </div>
  );
};

const ConceptMap = ({ concepts = [] }) => (
  <GraphicsEngine>
    <ConceptMapContent concepts={concepts} />
  </GraphicsEngine>
);

export default ConceptMap;
