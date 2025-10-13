import React, { useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import ReasonerControlPanel from './ReasonerControlPanel';
import LogList from './LogList';
import TasksPanel from './TasksPanel';
import ConceptMap from './ConceptMap';
import SortableItem from './SortableItem';
import useCrdtWebSocket from '../core/crdtWebSocket';
import { PANEL_CONFIG, THEME } from '../constants';
import Panel from './Panel';

const ConnectionTab = ({ name, url }) => {
  const {
    isConnected,
    connectionStatus,
    error,
    tasks,
    logs,
    concepts,
    reasonerStats,
    sendRawMessage,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
  } = useCrdtWebSocket(url);
  const [activeId, setActiveId] = useState(null);

  const [panels, setPanels] = useState([
    PANEL_CONFIG.topPanel,
    PANEL_CONFIG.conceptMapPanel,
    PANEL_CONFIG.bottomPanel,
  ]);

  const handleSendMessage = (command) => {
    sendRawMessage({ type: 'command', payload: { data: command } });
  };

  const handleCommand = (command, payload) => {
    sendRawMessage({ type: 'control', command, payload });
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

  const renderPanel = (panel) => {
    switch (panel.id) {
      case 'topPanel':
        return (
          <Panel title={panel.name}>
            <ReasonerControlPanel 
              stats={reasonerStats} 
              onCommand={handleCommand} 
              onAddTask={handleAddTask} 
            />
          </Panel>
        );
      case 'conceptMapPanel':
        return (
          <Panel title={panel.name}>
            <ConceptMap concepts={concepts} tasks={tasks} />
          </Panel>
        );
      case 'bottomPanel':
        return (
          <div style={{ display: 'flex', gap: THEME.spacing.md, height: '100%' }}>
            <div style={{ flex: 1 }}>
              <Panel title="Log">
                <LogList logs={logs} />
              </Panel>
            </div>
            <div style={{ flex: 1 }}>
              <Panel title="Tasks">
                <TasksPanel
                  tasks={tasks}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                />
              </Panel>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusStyles = () => {
    const baseStyles = {
      padding: THEME.spacing.sm,
      marginBottom: THEME.spacing.md,
      borderRadius: THEME.borderRadius,
      color: THEME.colors.white,
      fontWeight: THEME.fontWeight.bold,
    };

    switch (connectionStatus) {
      case 'connected':
        return { ...baseStyles, backgroundColor: THEME.colors.success };
      case 'connecting':
      case 'reconnecting':
        return { ...baseStyles, backgroundColor: THEME.colors.warning };
      case 'disconnected':
      default:
        return { ...baseStyles, backgroundColor: THEME.colors.danger };
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'disconnected':
      default:
        return 'Disconnected';
    }
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
      <div style={getStatusStyles()}>
        <strong>Connection:</strong> {name} ({url}) - Status: {getStatusText()}
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
