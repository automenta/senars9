import React, { useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ReasonerControlPanel from './ReasonerControlPanel';
import InputField from './InputField';
import LogList from './LogList';
import TasksTree from './TasksTree';
import ConceptMap from './ConceptMap';
import useWebSocket from '../core/WebSocketManager';

const SortableItem = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

const ConnectionTab = ({ name, url }) => {
  const { isConnected, messages, sendMessage } = useWebSocket(url);

  const [panels, setPanels] = useState([
    { id: 'topPanel', name: 'Control & Input' },
    { id: 'conceptMapPanel', name: 'Concept Map' },
    { id: 'bottomPanel', name: 'Log & Tasks' },
  ]);

  const handleSendMessage = (command) => {
    sendMessage({ type: 'command', data: command });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setPanels((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const filteredLogMessages = messages.filter((msg) => msg.type === 'log');
  const filteredTaskMessages = messages.filter((msg) => msg.type === 'task');
  const filteredConceptMessages = messages.filter((msg) => msg.type === 'concept');
  const reasonerStats = messages.find((msg) => msg.type === 'reasoner_stats')?.data || null;

  const renderPanel = (panel) => {
    switch (panel.id) {
      case 'topPanel':
        return (
          <div className="top-section" style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '200px',
            maxHeight: '300px',
            overflow: 'auto',
            marginBottom: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: 'white'
          }}>
            <div className="panel-header" style={{
              backgroundColor: '#e9ecef',
              padding: '5px 10px',
              borderTopLeftRadius: '4px',
              borderTopRightRadius: '4px',
              fontWeight: 'bold',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'move'
            }}>
              <span>{panel.name}</span>
            </div>
            <div style={{ padding: '10px' }}>
              <ReasonerControlPanel stats={reasonerStats} />
              <InputField onSend={handleSendMessage} />
            </div>
          </div>
        );
      case 'conceptMapPanel':
        return (
          <div className="concept-map-section" style={{
            flex: 1,
            minHeight: '0',
            marginBottom: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            overflow: 'hidden',
            backgroundColor: 'white'
          }}>
            <div className="panel-header" style={{
              backgroundColor: '#e9ecef',
              padding: '5px 10px',
              borderTopLeftRadius: '4px',
              borderTopRightRadius: '4px',
              fontWeight: 'bold',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'move'
            }}>
              <span>{panel.name}</span>
            </div>
            <div style={{ height: 'calc(100% - 30px)', padding: '10px' }}>
              <ConceptMap concepts={filteredConceptMessages} />
            </div>
          </div>
        );
      case 'bottomPanel':
        return (
          <div className="bottom-section" style={{
            display: 'flex',
            gap: '10px',
            maxHeight: '300px',
            minHeight: '200px'
          }}>
            <div className="log-section" style={{
              flex: 1,
              border: '1px solid #ccc',
              borderRadius: '4px',
              overflow: 'hidden',
              backgroundColor: 'white'
            }}>
              <div className="panel-header" style={{
                backgroundColor: '#e9ecef',
                padding: '5px 10px',
                borderTopLeftRadius: '4px',
                fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'move'
              }}>
                <span>Log</span>
              </div>
              <div style={{ height: 'calc(100% - 30px)', padding: '10px' }}>
                <LogList logs={filteredLogMessages} />
              </div>
            </div>
            <div className="tasks-section" style={{
              flex: 1,
              border: '1px solid #ccc',
              borderRadius: '4px',
              overflow: 'hidden',
              backgroundColor: 'white'
            }}>
              <div className="panel-header" style={{
                backgroundColor: '#e9ecef',
                padding: '5px 10px',
                borderTopRightRadius: '4px',
                fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Tasks</span>
              </div>
              <div style={{ height: 'calc(100% - 30px)', padding: '10px' }}>
                <TasksTree tasks={filteredTaskMessages} />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="connection-tab" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f8f9fa'
    }}>
      <div className="connection-status" style={{
        padding: '8px 10px',
        backgroundColor: isConnected ? '#d4edda' : '#f8d7da',
        color: isConnected ? '#155724' : '#721c24',
        border: '1px solid',
        borderRadius: '4px',
        marginBottom: '10px'
      }}>
        <div>
          <strong>Connection:</strong> {name} ({url}) - Status: {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={panels}
          strategy={verticalListSortingStrategy}
        >
          <div className="main-layout" style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden'
          }}>
            {panels.map(panel => (
              <SortableItem key={panel.id} id={panel.id}>
                {renderPanel(panel)}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default ConnectionTab;
