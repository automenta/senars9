import React, { useState, useEffect } from 'react';
import ConnectionTab from './components/ConnectionTab';
import './App.css';

function App() {
  const [connectionTabs, setConnectionTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    // Initialize with one default connection tab that connects to the integrated server running on port 8080
    const defaultTab = {
      id: 0,
      name: 'Local (Integrated)',
      url: 'ws://localhost:8080' // Default integrated server port
    };
    setConnectionTabs([defaultTab]);
  }, []);

  const addConnectionTab = (name, url) => {
    const newTab = {
      id: connectionTabs.length,
      name,
      url
    };
    setConnectionTabs([...connectionTabs, newTab]);
    setActiveTab(newTab.id);
  };

  const removeConnectionTab = (id) => {
    if (connectionTabs.length <= 1) return; // Prevent removing the last tab
    
    const updatedTabs = connectionTabs.filter(tab => tab.id !== id);
    setConnectionTabs(updatedTabs);
    
    // If the removed tab was the active one, switch to the first tab
    if (id === activeTab) {
      setActiveTab(updatedTabs[0].id);
    }
  };

  return (
    <div className="app" data-testid="app-container" style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '10px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f2f5'
    }}>
      <h1 style={{ textAlign: 'center', margin: '0 0 20px 0', color: '#2c3e50', fontSize: '24px' }}>SeNARS UI</h1>
      
      {/* Tabs - Only show if there are multiple connections */}
      {connectionTabs.length > 1 && (
        <div className="tabs" style={{
          display: 'flex',
          marginBottom: '10px',
          borderBottom: '2px solid #ccc'
        }}>
          {connectionTabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                cursor: 'pointer',
                backgroundColor: activeTab === tab.id ? '#007bff' : '#f8f9fa',
                color: activeTab === tab.id ? 'white' : '#333',
                border: '1px solid #ccc',
                borderBottom: activeTab === tab.id ? 'none' : '1px solid #ccc',
                borderTopLeftRadius: '4px',
                borderTopRightRadius: '4px',
                marginRight: '2px',
                position: 'relative'
              }}
            >
              {tab.name}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  removeConnectionTab(tab.id);
                }}
                style={{
                  marginLeft: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                ×
              </span>
            </div>
          ))}
          <button
            onClick={() => addConnectionTab(`Connection ${connectionTabs.length + 1}`, 'ws://localhost:8081')}
            style={{
              padding: '10px 15px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginLeft: '10px'
            }}
          >
            Add Connection
          </button>
        </div>
      )}

      {/* Active Tab Content */}
      <div className="tab-content" style={{
        flex: 1,
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '10px',
        overflow: 'auto',
        backgroundColor: 'white'
      }}>
        {connectionTabs.length > 0 && connectionTabs.find(tab => tab.id === activeTab) && (
          <ConnectionTab 
            name={connectionTabs.find(tab => tab.id === activeTab).name} 
            url={connectionTabs.find(tab => tab.id === activeTab).url} 
          />
        )}
      </div>
    </div>
  );
}

export default App
