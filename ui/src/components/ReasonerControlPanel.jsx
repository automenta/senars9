import React, { useState } from 'react';

// Using simple inline SVG icons for buttons
const PlayIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const StopIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>;
const ResetIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>;


const ReasonerControlPanel = ({ stats }) => {
  const [cpuThrottle, setCpuThrottle] = useState(100);

  const handleCpuThrottleChange = (e) => {
    setCpuThrottle(parseInt(e.target.value));
    // In a real implementation, this would send throttle command to the backend
  };

  const handleControlCommand = (command) => {
    // In a real implementation, this would send the command to the backend
    console.log(`Sending command: ${command}`);
  };

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    border: '1px solid #ccc',
    borderRadius: '3px',
    cursor: 'pointer',
    backgroundColor: '#f0f0f0',
    margin: '0 2px',
    minWidth: '24px'
  };

  const statStyle = {
    margin: '0 8px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center'
  };

  return (
    <div className="reasoner-control-panel" style={{
      display: 'flex',
      alignItems: 'center',
      padding: '4px 8px',
      backgroundColor: '#f8f9fa',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Control Buttons */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button onClick={() => handleControlCommand('start')} style={{...buttonStyle, color: '#28a745'}} title="Start"><PlayIcon /></button>
        <button onClick={() => handleControlCommand('stop')} style={{...buttonStyle, color: '#dc3545'}} title="Stop"><StopIcon /></button>
        <button onClick={() => handleControlCommand('reset')} style={{...buttonStyle, color: '#ffc107'}} title="Reset"><ResetIcon /></button>
      </div>

      {/* Spacer */}
      <div style={{ width: '1px', backgroundColor: '#ccc', height: '20px', margin: '0 10px' }}></div>

      {/* Status */}
      <div style={statStyle}>
        <strong>Status:</strong>
        <span style={{
          marginLeft: '5px',
          padding: '2px 8px',
          backgroundColor: stats?.running ? '#d4edda' : '#f8d7da',
          color: stats?.running ? '#155724' : '#721c24',
          borderRadius: '12px',
          fontSize: '11px'
        }}>
          {stats?.running ? 'Running' : 'Stopped'}
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flexGrow: 1 }}></div>

      {/* Stats */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={statStyle}><strong>Concepts:</strong> <span style={{marginLeft: '4px', color: '#007bff'}}>{stats?.concepts || 0}</span></div>
        <div style={statStyle}><strong>Tasks:</strong> <span style={{marginLeft: '4px', color: '#28a745'}}>{stats?.tasks || 0}</span></div>
        <div style={statStyle}><strong>Cycles:</strong> <span style={{marginLeft: '4px', color: '#ffc107'}}>{stats?.cycles || 0}</span></div>
      </div>

      {/* Spacer */}
      <div style={{ flexGrow: 1 }}></div>

      {/* CPU Throttle */}
      <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
        <label style={{ marginRight: '5px' }}>CPU Throttle:</label>
        <input
          type="range"
          min="1"
          max="100"
          value={cpuThrottle}
          onChange={handleCpuThrottleChange}
          style={{ width: '80px', margin: '0 5px' }}
        />
        <span>{cpuThrottle}%</span>
      </div>
    </div>
  );
};

export default ReasonerControlPanel;