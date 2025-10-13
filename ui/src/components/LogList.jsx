import React, { useState, useEffect, useRef } from 'react';
import { getLogLevelColor, getLogIcon, extractLogData, extractLogLevel } from '../utils/common';

const LogList = ({ logs = [] }) => {
  const [displayLogs, setDisplayLogs] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef(null);
  const fixedBufferSize = 100; // Fixed buffer size for continuous operation
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    if (!isPaused) {
      // Limit the logs to the fixed buffer size
      const updatedLogs = [...logs].slice(-fixedBufferSize);
      setDisplayLogs(updatedLogs);
    }
  }, [logs, isPaused]);

  // Auto-scroll to bottom when new logs come in
  useEffect(() => {
    if (!isPaused && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayLogs, isPaused]);

  const clearLogs = () => {
    setDisplayLogs([]);
  };



  const handleLogClick = (log, index) => {
    setExpandedLog(expandedLog === index ? null : index);
  };

  const headerControlsStyle = {
    display: 'flex',
    gap: '4px'
  };

  const controlButtonStyle = (bgColor) => ({
    padding: '2px 8px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
    backgroundColor: bgColor,
    color: 'white'
  });

  return (
    <div className="log-list" style={{
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
        fontSize: '12px'
      }}>
        <div>
          Log Activity (Buffer: {displayLogs.length}/{fixedBufferSize})
        </div>
        <div style={headerControlsStyle}>
          <button
            onClick={() => setIsPaused(!isPaused)}
            style={controlButtonStyle(isPaused ? '#28a745' : '#6c757d')}
          >
            {isPaused ? '▶️ Resume' : '⏸️ Pause'}
          </button>
          <button
            onClick={clearLogs}
            style={controlButtonStyle('#dc3545')}
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '5px',
          fontFamily: 'monospace',
          fontSize: '12px',
          backgroundColor: '#ffffff'
        }}
      >
        {displayLogs && displayLogs.length > 0 ? (
          <ul style={{ 
            margin: 0, 
            padding: 0, 
            listStyleType: 'none',
            animation: 'fadeIn 0.3s ease-in-out'
          }}>
            {displayLogs.map((log, index) => {
              // Check if log is a Yjs object (has get method) or a regular object
              const isYjsObject = log && typeof log.get === 'function';
              
              const logData = extractLogData(log);
              const message = typeof logData === 'string' ? logData : JSON.stringify(logData);
              const icon = getLogIcon(message);
              const level = isYjsObject ? (extractLogLevel(log) || message) : (log.level || 'info');
              const color = getLogLevelColor(level);

              return (
                <li
                  key={`${isYjsObject ? log.get('timestamp') : log.timestamp || Date.now() + index}-${index}-${message.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '')}`}
                  className="log-item"
                  style={{
                    padding: '6px 8px',
                    margin: '3px 0',
                    borderRadius: '4px',
                    backgroundColor: expandedLog === index ? '#f1f3f5' : 'transparent',
                    borderLeft: `3px solid ${color}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'flex-start'
                  }}
                  onClick={() => handleLogClick(log, index)}
                >
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: `${color}20`, // Lighter shade
                    marginRight: '8px',
                    fontSize: '12px'
                  }}>
                    {icon}
                  </span>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      marginBottom: '2px'
                    }}>
                      <span style={{ 
                        color: color,
                        fontWeight: 'bold',
                        fontSize: '11px',
                        marginRight: '6px'
                      }}>
                        {isYjsObject ? (log.get('type') || 'LOG') : (log.type || 'LOG')}
                      </span>
                      <span style={{ 
                        color: '#666', 
                        fontSize: '10px',
                        marginRight: '8px',
                        minWidth: '70px'
                      }}>
                        [{new Date(isYjsObject ? log.get('timestamp') : log.timestamp || Date.now()).toLocaleTimeString()}]
                      </span>
                      <span style={{ 
                        color: getLogLevelColor(isYjsObject ? extractLogLevel(log) : log.level),
                        fontSize: '11px',
                        fontStyle: 'italic'
                      }}>
                        {isYjsObject ? (extractLogLevel(log) || 'info') : (log.level || 'info')}
                      </span>
                    </div>
                    
                    <div style={{ 
                      color: '#333',
                      lineHeight: '1.4',
                      wordBreak: 'break-word'
                    }}>
                      {message.length > 100 && expandedLog !== index 
                        ? `${message.substring(0, 100)}...` 
                        : message}
                    </div>
                  </div>

                  {/* Additional info or action button when expanded */}
                  {expandedLog === index && (
                    <div style={{ 
                      marginTop: '8px', 
                      paddingTop: '8px', 
                      borderTop: '1px dashed #ccc',
                      fontSize: '11px',
                      color: '#666'
                    }}>
                      <div><strong>Full details:</strong></div>
                      <div style={{ 
                        marginTop: '4px', 
                        padding: '4px', 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: '3px',
                        fontFamily: 'monospace',
                        fontSize: '10px',
                        maxHeight: '100px',
                        overflowY: 'auto'
                      }}>
                        {isYjsObject ? JSON.stringify(log.toJSON(), null, 2) : JSON.stringify(log, null, 2)}
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        gap: '8px', 
                        marginTop: '6px',
                        flexWrap: 'wrap'
                      }}>
                        <button 
                          style={{
                            padding: '2px 6px',
                            fontSize: '10px',
                            border: '1px solid #ccc',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            backgroundColor: '#e9ecef'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(message);
                          }}
                        >
                          📋 Copy
                        </button>
                        <button 
                          style={{
                            padding: '2px 6px',
                            fontSize: '10px',
                            border: '1px solid #ccc',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            backgroundColor: '#e9ecef'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            // In a real implementation, this could filter logs by type
                            console.log('Filter by type:', isYjsObject ? log.get('type') : log.type);
                          }}
                        >
                          🔍 Filter
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
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
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>📋</div>
            <div>No log messages yet...</div>
            <div style={{ fontSize: '10px', marginTop: '5px' }}>Connect to a server to see activity logs</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogList;
