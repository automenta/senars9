import React, { useState } from 'react';
import { DndContext, closestCorners } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getPriorityColor, getItemIcon } from '../utils/common';

// Sortable item component for concepts
const SortableConceptItem = ({ concept, index, onPriorityChange, onDeleteConcept }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: concept.id || index });

  const [isExpanded, setIsExpanded] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleConceptClick = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      ref={setNodeRef}
      className="concept-item"
      style={{
        ...style,
        padding: '6px 8px',
        margin: '2px 0',
        backgroundColor: isExpanded ? '#f0f8ff' : '#f8f9fa',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        fontSize: '12px',
        border: `1px solid ${isExpanded ? '#0d6efd' : '#ced4da'}`,
        cursor: 'grab',
        transition: 'all 0.2s ease',
        minHeight: '36px'
      }}
      {...attributes}
      {...listeners}
      onClick={handleConceptClick}
    >
      {/* Concept type icon */}
      <span style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: `${getPriorityColor(concept.priority || 0.5)}20`,
        marginRight: '8px',
        fontSize: '12px',
        color: getPriorityColor(concept.priority || 0.5)
      }}>
        {getItemIcon('concept')}
      </span>

      {/* Concept content - one line as specified */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        <div style={{
          fontWeight: '500',
          color: '#333',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {concept.content || concept.name || concept.id || `Concept ${index + 1}`}
        </div>
      </div>

      {/* Priority display and controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        minWidth: '120px',
        justifyContent: 'flex-end'
      }}>
        <span
          style={{
            fontWeight: 'bold',
            color: getPriorityColor(concept.priority || 0.5),
            fontSize: '11px',
            minWidth: '30px',
            textAlign: 'right'
          }}
        >
          {(concept.priority || 0).toFixed(2)}
        </span>

        {/* Priority slider for quick reprioritization */}
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={concept.priority || 0.5}
          onChange={(e) => onPriorityChange(concept, parseFloat(e.target.value))}
          style={{
            width: '40px',
            cursor: 'ew-resize',
            height: '16px'
          }}
          title="Drag to reprioritize"
        />

        {/* Popup button for progressive disclosure */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          style={{
            padding: '2px 6px',
            backgroundColor: isExpanded ? '#0d6efd' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ⋯
        </button>
      </div>

      {/* Expanded details view */}
      {isExpanded && (
        <div style={{
          position: 'absolute',
          left: '0',
          right: '0',
          top: '100%',
          backgroundColor: 'white',
          border: '1px solid #0d6efd',
          borderRadius: '4px',
          padding: '10px',
          zIndex: 20,
          marginTop: '2px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          fontSize: '11px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, color: '#0d6efd' }}>Concept Details</h4>
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer',
                color: '#6c757d'
              }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div><strong>ID:</strong> {concept.id || 'N/A'}</div>
            <div><strong>Name:</strong> {concept.name || 'N/A'}</div>
            <div><strong>Type:</strong> {concept.type || 'concept'}</div>
            <div><strong>Priority:</strong> {(concept.priority || 0).toFixed(3)}</div>
            <div><strong>Content:</strong> {concept.content || 'N/A'}</div>
            <div><strong>Term Type:</strong> {concept.termType || 'N/A'}</div>
          </div>

          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
            <button
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                cursor: 'pointer',
                backgroundColor: '#e9ecef'
              }}
              onClick={() => console.log('Explore concept:', concept.id)}
            >
              🔍 Explore
            </button>
            <button
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                cursor: 'pointer',
                backgroundColor: '#e9ecef'
              }}
              onClick={() => onDeleteConcept(concept)}
            >
              🗑️ Delete
            </button>
            <button
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                cursor: 'pointer',
                backgroundColor: '#e9ecef'
              }}
              onClick={() => onPriorityChange(concept, Math.min(1, (concept.priority || 0) + 0.1))}
            >
              ⬆️ Up Priority
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ConceptsPanel = ({ concepts = [], onUpdateConcept, onDeleteConcept, onAddConcept }) => {
  // The concepts prop is already sorted by the useCrdtWebSocket hook.
  // We keep a local state only to handle the drag-and-drop reordering visually.
  const [displayConcepts, setDisplayConcepts] = useState(concepts || []);

  React.useEffect(() => {
    setDisplayConcepts(concepts || []);
  }, [concepts]);

  const handlePriorityChange = (concept, newPriority) => {
    if (onUpdateConcept) {
      const updatedConcept = {
        ...concept,
        priority: newPriority,
        lastModified: Date.now(),
      };
      onUpdateConcept(updatedConcept);
    }
  };

  const handleDeleteConcept = (concept) => {
    if (onDeleteConcept) {
      onDeleteConcept(concept);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = displayConcepts.findIndex(concept => concept.id === active.id);
      const newIndex = displayConcepts.findIndex(concept => concept.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newConcepts = arrayMove(displayConcepts, oldIndex, newIndex);
        setDisplayConcepts(newConcepts);
        // Note: This only reorders the visual list. The actual priority-based order
        // will be restored on the next update from the server.
        // For a more persistent reordering, you would need to adjust priorities here.
      }
    }
  };

  return (
    <div className="concepts-tree" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '5px 10px',
        backgroundColor: '#e9ecef',
        borderBottom: '1px solid #ccc',
        fontSize: '12px',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>Active Concepts ({displayConcepts.length})</div>
      </div>

      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
          position: 'relative'
        }}>
          <SortableContext items={displayConcepts.map(c => c.id || displayConcepts.indexOf(c))} strategy={verticalListSortingStrategy}>
            {displayConcepts && displayConcepts.length > 0 ? (
              displayConcepts.map((concept, index) => (
                <div key={`${concept.id || index}-container`} style={{ position: 'relative' }}>
                  <SortableConceptItem
                    concept={concept}
                    index={index}
                    onPriorityChange={handlePriorityChange}
                    onDeleteConcept={handleDeleteConcept}
                  />
                </div>
              ))
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#999',
                fontStyle: 'italic',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>🧠</div>
                <div>No active concepts</div>
                <div style={{ fontSize: '10px', marginTop: '5px' }}>Concepts will appear here as they are created or activated</div>
              </div>
            )}
          </SortableContext>
        </div>
      </DndContext>
    </div>
  );
};

export default ConceptsPanel;