import React, { useState, useEffect, useRef } from 'react';

const LogList = ({ logs }) => {
  const [displayLogs, setDisplayLogs] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef(null);
  const fixedBufferSize = 100; // Fixed buffer size for continuous operation

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

  const getLogLevelColor = (level) => {
    // Determine color based on log level or content
    if (level?.toLowerCase().includes('error')) return '#dc3545';
    if (level?.toLowerCase().includes('warn')) return '#ffc107';
    if (level?.toLowerCase().includes('info')) return '#17a2b8';
    if (level?.toLowerCase().includes('debug')) return '#6c757d';
    return '#28a745'; // Default success/good color
  };

  const getLogIcon = (message) => {
    // Determine icon based on message content
    if (typeof message === 'string') {
      if (message.toLowerCase().includes('error')) return '❌';
      if (message.toLowerCase().includes('warning') || message.toLowerCase().includes('warn')) return '⚠️';
      if (message.toLowerCase().includes('info')) return 'ℹ️';
      if (message.toLowerCase().includes('task')) return '📋';
      if (message.toLowerCase().includes('concept')) return '🧠';
      if (message.toLowerCase().includes('cycle')) return '🔄';
    }
    return '🔹'; // Default icon
  };

  return (
    <div className="log-list" style={{
      height: '200px',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #ccc',
      borderRadius: '4px',
      backgroundColor: '#f8f9fa'
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
        <div>
          <button
            onClick={() => setIsPaused(!isPaused)}
            style={{
              padding: '2px 8px',
              margin: '0 5px',
              fontSize: '12px',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer'
            }}
          >
            {isPaused ? '▶️' : '⏸️'}
          </button>
          <button
            onClick={clearLogs}
            style={{
              padding: '2px 8px',
              fontSize: '12px',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer'
            }}
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
          padding: '10px',
          fontFamily: 'monospace',
          fontSize: '13px'
        }}
      >
        {displayLogs && displayLogs.length > 0 ? (
          <ul style={{ margin: 0, padding: 0, listStyleType: 'none' }}>
            {displayLogs.map((log, index) => {
              const message = typeof log.data === 'string' ? log.data : JSON.stringify(log.data);
              const icon = getLogIcon(message);
              const color = getLogLevelColor(log.level || message);

              return (
                <li
                  key={index}
                  className="list-item-enter"
                  style={{
                    padding: '4px 0',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    alignItems: 'flex-start'
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    minWidth: '20px',
                    color: color
                  }}>
                    {icon}
                  </span>
                  <span style={{
                    color: color,
                    marginLeft: '5px',
                    flex: 1
                  }}>
                    <span style={{ color: '#666', fontSize: '11px', marginRight: '8px' }}>
                      [{new Date().toLocaleTimeString()}]
                    </span>
                    {message}
                  </span>

                  {/* Inline widget for progressive disclosure */}
                  {message.length > 50 && (
                    <details style={{ marginLeft: '10px', fontSize: '11px' }}>
                      <summary>Details</summary>
                      <div style={{ marginTop: '5px', padding: '5px', backgroundColor: '#fff', borderRadius: '3px' }}>
                        Full message: {JSON.stringify(log)}
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p style={{ color: '#999', fontStyle: 'italic', margin: 0, textAlign: 'center', marginTop: '50px' }}>
            No log messages yet...
          </p>
        )}
      </div>
    </div>
  );
};

export default LogList;