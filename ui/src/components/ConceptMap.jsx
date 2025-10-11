import React, { useEffect, useRef, useState } from 'react';

const ConceptMap = ({ concepts }) => {
  const canvasRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const animationRef = useRef(null);
  const [positions, setPositions] = useState({});
  
  // Physics simulation parameters
  const repulsion = 500;
  const timeStep = 0.05;

  // Process concepts into visualization elements
  useEffect(() => {
    if (!canvasRef.current || concepts.length === 0) return;
    
    const canvas = canvasRef.current;
    
    // Set canvas size
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Initialize positions randomly
    const initialPositions = {};
    concepts.forEach((concept, idx) => {
      initialPositions[concept.data?.id || `concept-${idx}`] = {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: 0,
        vy: 0,
        fixed: false
      };
    });
    setPositions(initialPositions);
    
  }, [concepts]);

  // Animation loop for physics simulation
  useEffect(() => {
    if (isPaused || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const animate = () => {
      if (!canvas || concepts.length === 0) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw connections between concepts
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
      ctx.lineWidth = 1;
      
      for (let idx = 0; idx < concepts.length; idx++) {
        for (let jdx = idx + 1; jdx < concepts.length; jdx++) {
          const id1 = concepts[idx].data?.id || `concept-${idx}`;
          const id2 = concepts[jdx].data?.id || `concept-${jdx}`;
          const pos1 = positions[id1];
          const pos2 = positions[id2];
          
          if (pos1 && pos2) {
            ctx.beginPath();
            ctx.moveTo(pos1.x, pos1.y);
            ctx.lineTo(pos2.x, pos2.y);
            ctx.stroke();
          }
        }
      }
      
      // Calculate forces and update positions
      const updatedPositions = { ...positions };
      
      // Repulsion between all nodes
      Object.keys(updatedPositions).forEach((id1, idx1) => {
        Object.keys(updatedPositions).forEach((id2, idx2) => {
          if (idx1 !== idx2 && !updatedPositions[id1].fixed && !updatedPositions[id2].fixed) {
            const pos1 = updatedPositions[id1];
            const pos2 = updatedPositions[id2];
            
            const dx = pos1.x - pos2.x;
            const dy = pos1.y - pos2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
              const force = repulsion / (distance * distance);
              const fx = (dx / distance) * force * timeStep;
              const fy = (dy / distance) * force * timeStep;
              
              pos1.vx += fx;
              pos1.vy += fy;
              pos2.vx -= fx;
              pos2.vy -= fy;
            }
          }
        });
      });
      
      // Update positions based on velocities
      Object.keys(updatedPositions).forEach((id) => {
        if (!updatedPositions[id].fixed) {
          updatedPositions[id].x += updatedPositions[id].vx;
          updatedPositions[id].y += updatedPositions[id].vy;
          
          // Apply damping to slow down movement
          updatedPositions[id].vx *= 0.9;
          updatedPositions[id].vy *= 0.9;
        }
        
        // Boundary constraints
        const pos = updatedPositions[id];
        if (pos.x < 10) { pos.x = 10; pos.vx = 0; }
        if (pos.x > canvas.width - 10) { pos.x = canvas.width - 10; pos.vx = 0; }
        if (pos.y < 10) { pos.y = 10; pos.vy = 0; }
        if (pos.y > canvas.height - 10) { pos.y = canvas.height - 10; pos.vy = 0; }
      });
      
      setPositions(updatedPositions);
      
      // Draw nodes
      concepts.forEach((concept, idx) => {
        const id = concept.data?.id || `concept-${idx}`;
        const pos = positions[id];
        
        if (pos) {
          const priority = concept.data?.priority || 0.5;
          const size = 5 + (priority * 10); // Size based on priority
          
          // Determine color based on priority
          let r, g, b;
          if (priority > 0.7) {
            r = 40; g = 167; b = 69; // Green for high priority
          } else if (priority > 0.4) {
            r = 255; g = 193; b = 7; // Yellow for medium priority
          } else {
            r = 0; g = 123; b = 255; // Blue for low priority
          }
          
          // Draw node
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Draw label
          if (concept.data?.name) {
            ctx.fillStyle = 'black';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(concept.data.name.substring(0, 10), pos.x, pos.y + size + 15);
          }
        }
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [positions, concepts, isPaused]);

  const handleCanvasClick = (e) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicked on a node
    concepts.forEach((concept, idx) => {
      const id = concept.data?.id || `concept-${idx}`;
      const pos = positions[id];
      
      if (pos) {
        const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
        if (distance < 15) { // 15 is a reasonable click radius
          alert(`Concept: ${concept.data?.name || id}\nPriority: ${(concept.data?.priority || 0).toFixed(2)}\nFrequency: ${concept.data?.frequency || 0}`);
        }
      }
    });
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  return (
    <div className="concept-map" style={{
      height: '100%',
      border: '1px solid #ccc',
      borderRadius: '4px',
      backgroundColor: 'white',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 10,
        display: 'flex',
        gap: '5px'
      }}>
        <button 
          onClick={togglePause}
          style={{
            padding: '5px 10px',
            fontSize: '12px',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            backgroundColor: isPaused ? '#28a745' : '#6c757d',
            color: 'white'
          }}
        >
          {isPaused ? '▶️ Play' : '⏸️ Pause'}
        </button>
      </div>
      
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
    </div>
  );
};

export default ConceptMap;