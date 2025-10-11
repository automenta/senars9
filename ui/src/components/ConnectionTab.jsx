import React, { useState } from 'react';
import ReasonerControlPanel from './ReasonerControlPanel';
import InputField from './InputField';
import LogList from './LogList';
import TasksTree from './TasksTree';
import ConceptMap from './ConceptMap';
import useWebSocket from '../core/WebSocketManager';

const ConnectionTab = ({ name, url }) => {
  // Use the name and url props directly since we're not changing them
  
  // Use the WebSocket hook
  const { isConnected, messages, sendMessage } = useWebSocket(url);

  const [layout, setLayout] = useState({
    topPanel: true,
    conceptMapPanel: true,
    bottomPanel: true
  });

  const handleSendMessage = (command) => {
    sendMessage({ type: 'command', data: command });
  };

  // Process messages based on type
  const filteredLogMessages = messages.filter(msg => msg.type === 'log');
  const filteredTaskMessages = messages.filter(msg => msg.type === 'task');
  const filteredConceptMessages = messages.filter(msg => msg.type === 'concept');
  const reasonerStats = messages.find(msg => msg.type === 'reasoner_stats')?.data || null;

  return (
    <div className="connection-tab" style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f8f9fa'
    }}>
      {/* Connection Status Bar */}
      <div className="connection-status" style={{ 
        padding: '8px 10px', 
        backgroundColor: isConnected ? '#d4edda' : '#f8d7da',
        color: isConnected ? '#155724' : '#721c24',
        border: '1px solid',
        borderRadius: '4px',
        marginBottom: '10px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Connection:</strong> {name} ({url}) - Status: {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            <span style={{ 
              display: 'inline-block', 
              width: '10px', 
              height: '10px', 
              borderRadius: '50%', 
              backgroundColor: isConnected ? '#28a745' : '#dc3545',
              marginRight: '5px'
            }}></span>
          </div>
        </div>
      </div>

      {/* Main IDE-like docking layout */}
      <div className="main-layout" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* Top Section: Reasoner Control and Input */}
        {layout.topPanel && (
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
              alignItems: 'center'
            }}>
              <span>Control & Input</span>
              <button 
                onClick={() => setLayout(prev => ({ ...prev, topPanel: !prev.topPanel }))}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '16px', 
                  cursor: 'pointer' 
                }}
              >
                −
              </button>
            </div>
            
            <div style={{ padding: '10px' }}>
              <ReasonerControlPanel stats={reasonerStats} />
              <InputField onSend={handleSendMessage} />
            </div>
          </div>
        )}
        {!layout.topPanel && (
          <div style={{ textAlign: 'center', marginBottom: '5px' }}>
            <button 
              onClick={() => setLayout(prev => ({ ...prev, topPanel: !prev.topPanel }))}
              style={{ 
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Show Control & Input ▲
            </button>
          </div>
        )}

        {/* Center Section: Concept Map (Main Visualization) */}
        {layout.conceptMapPanel && (
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
              alignItems: 'center'
            }}>
              <span>Concept Map</span>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button 
                  onClick={() => setLayout(prev => ({ ...prev, conceptMapPanel: !prev.conceptMapPanel }))}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    fontSize: '16px', 
                    cursor: 'pointer' 
                  }}
                >
                  −
                </button>
              </div>
            </div>
            <div style={{ height: 'calc(100% - 30px)', padding: '10px' }}>
              <ConceptMap concepts={filteredConceptMessages} />
            </div>
          </div>
        )}
        {!layout.conceptMapPanel && (
          <div style={{ textAlign: 'center', marginBottom: '5px' }}>
            <button 
              onClick={() => setLayout(prev => ({ ...prev, conceptMapPanel: !prev.conceptMapPanel }))}
              style={{ 
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Show Concept Map ▲
            </button>
          </div>
        )}

        {/* Bottom Section: Log and Tasks */}
        {layout.bottomPanel && (
          <div className="bottom-section" style={{ 
            display: 'flex', 
            gap: '10px',
            maxHeight: '300px',
            minHeight: '200px'
          }}>
            {/* Log Panel */}
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
                alignItems: 'center'
              }}>
                <span>Log</span>
                <button 
                  onClick={() => setLayout(prev => ({ ...prev, bottomPanel: !prev.bottomPanel }))}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    fontSize: '16px', 
                    cursor: 'pointer' 
                  }}
                >
                  −
                </button>
              </div>
              <div style={{ height: 'calc(100% - 30px)', padding: '10px' }}>
                <LogList logs={filteredLogMessages} />
              </div>
            </div>
            
            {/* Tasks Panel */}
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
        )}
        {!layout.bottomPanel && (
          <div style={{ textAlign: 'center' }}>
            <button 
              onClick={() => setLayout(prev => ({ ...prev, bottomPanel: !prev.bottomPanel }))}
              style={{ 
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Show Log & Tasks ▲
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionTab;