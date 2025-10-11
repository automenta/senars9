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
import { PANEL_CONFIG, MESSAGE_TYPES, THEME } from '../constants';
import Panel from './Panel';

const ConnectionTab = ({ name, url }) => {
  const { isConnected, messages, error, sendMessage } = useWebSocket(url);
  const [activeId, setActiveId] = useState(null);

  const [panels, setPanels] = useState([
    PANEL_CONFIG.topPanel,
    PANEL_CONFIG.conceptMapPanel,
    PANEL_CONFIG.bottomPanel,
  ]);

  const handleSendMessage = (command) => {
    sendMessage({ type: 'command', data: command });
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
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
          <Panel title={panel.name}>
            <ReasonerControlPanel stats={reasonerStats} />
            <InputField onSend={handleSendMessage} />
          </Panel>
        );
      case 'conceptMapPanel':
        return (
          <Panel title={panel.name}>
            <ConceptMap concepts={filteredConceptMessages} />
          </Panel>
        );
      case 'bottomPanel':
        return (
          <div style={{ display: 'flex', gap: THEME.spacing.md, height: '100%' }}>
            <div style={{ flex: 1 }}>
              <Panel title="Log">
                <LogList logs={filteredLogMessages} />
              </Panel>
            </div>
            <div style={{ flex: 1 }}>
              <Panel title="Tasks">
                <TasksTree tasks={filteredTaskMessages} />
              </Panel>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const connectionStatusStyles = {
    padding: THEME.spacing.sm,
    marginBottom: THEME.spacing.md,
    borderRadius: THEME.borderRadius,
    color: THEME.colors.white,
    fontWeight: THEME.fontWeight.bold,
    backgroundColor: isConnected ? THEME.colors.success : THEME.colors.danger,
  };

  const errorStyles = {
    padding: THEME.spacing.sm,
    marginBottom: THEME.spacing.md,
    borderRadius: THEME.borderRadius,
    color: THEME.colors.white,
    backgroundColor: THEME.colors.danger,
  };

  return (
    <div className="connection-tab">
      <div style={connectionStatusStyles}>
        <strong>Connection:</strong> {name} ({url}) - Status: {isConnected ? 'Connected' : 'Disconnected'}
      </div>

      {error && (
        <div style={errorStyles}>
          <strong>Error:</strong> {error.message}
        </div>
      )}

      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={panels}
          strategy={verticalListSortingStrategy}
        >
          <div className="main-layout">
            {panels.map(panel => (
              <SortableItem key={panel.id} id={panel.id} activeId={activeId}>
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
