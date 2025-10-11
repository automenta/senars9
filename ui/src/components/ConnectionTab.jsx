import React, { useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import ReasonerControlPanel from './ReasonerControlPanel';
import InputField from './InputField';
import LogList from './LogList';
import TasksTree from './TasksTree';
import ConceptMap from './ConceptMap';
import SortableItem from './SortableItem';
import useWebSocket from '../core/WebSocketManager';
import { PANEL_CONFIG, MESSAGE_TYPES, THEME, LAYOUT } from '../constants';

const ConnectionTab = ({ name, url }) => {
  const { isConnected, messages, sendMessage } = useWebSocket(url);

  const [panels, setPanels] = useState([
    PANEL_CONFIG.topPanel,
    PANEL_CONFIG.conceptMapPanel,
    PANEL_CONFIG.bottomPanel,
  ]);

  const handleSendMessage = (command) => {
    sendMessage({ type: 'command', data: command });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setPanels(prev => {
        const oldIndex = prev.findIndex(item => item.id === active.id);
        const newIndex = prev.findIndex(item => item.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const filteredLogMessages = messages.filter(msg => msg.type === MESSAGE_TYPES.log);
  const filteredTaskMessages = messages.filter(msg => msg.type === MESSAGE_TYPES.task);
  const filteredConceptMessages = messages.filter(msg => msg.type === MESSAGE_TYPES.concept);
  const reasonerStats = messages.find(msg => msg.type === MESSAGE_TYPES.reasonerStats)?.data || null;

  const renderPanel = (panel) => {
    switch (panel.id) {
      case 'topPanel':
        return (
          <div className="panel top-section">
            <div className="panel-header">
              <span>{panel.name}</span>
            </div>
            <div className="panel-content">
              <ReasonerControlPanel stats={reasonerStats} />
              <InputField onSend={handleSendMessage} />
            </div>
          </div>
        );
      case 'conceptMapPanel':
        return (
          <div className="panel concept-map-section">
            <div className="panel-header">
              <span>{panel.name}</span>
            </div>
            <div className="panel-content concept-map-content">
              <ConceptMap concepts={filteredConceptMessages} />
            </div>
          </div>
        );
      case 'bottomPanel':
        return (
          <div className="bottom-section">
            <div className="panel log-section">
              <div className="panel-header">
                <span>Log</span>
              </div>
              <div className="panel-content log-content">
                <LogList logs={filteredLogMessages} />
              </div>
            </div>
            <div className="panel tasks-section">
              <div className="panel-header">
                <span>Tasks</span>
              </div>
              <div className="panel-content tasks-content">
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
    <div className="connection-tab">
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
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
          <div className="main-layout">
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
