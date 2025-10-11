import React, { useState, useEffect } from 'react';
import ConnectionTab from './components/ConnectionTab';
import { CONNECTION_DEFAULTS } from './constants';
import './App.css';

const App = () => {
  const [connectionTabs, setConnectionTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const defaultTab = {
      id: 0,
      name: 'Local (Integrated)',
      url: `ws://localhost:${CONNECTION_DEFAULTS.defaultPort}`
    };
    setConnectionTabs([defaultTab]);
  }, []);

  const addConnectionTab = (name, url) => {
    const newTab = {
      id: connectionTabs.length,
      name,
      url
    };
    setConnectionTabs(prev => [...prev, newTab]);
    setActiveTab(newTab.id);
  };

  const removeConnectionTab = (id) => {
    if (connectionTabs.length <= 1) return;

    const updatedTabs = connectionTabs.filter(tab => tab.id !== id);
    setConnectionTabs(updatedTabs);

    if (id === activeTab) {
      setActiveTab(updatedTabs[0]?.id || 0);
    }
  };

  const currentTab = connectionTabs.find(tab => tab.id === activeTab);

  return (
    <div className="app" data-testid="app-container">
      {connectionTabs.length > 1 && (
        <div className="tabs">
          {connectionTabs.map(tab => (
            <div
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.name}
              <span
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  removeConnectionTab(tab.id);
                }}
              >
                ×
              </span>
            </div>
          ))}
          <button
            className="add-connection-btn"
            onClick={() => addConnectionTab(`Connection ${connectionTabs.length + 1}`, `ws://localhost:${CONNECTION_DEFAULTS.fallbackPort}`)}
          >
            Add Connection
          </button>
        </div>
      )}

      <div className="tab-content">
        {currentTab && (
          <ConnectionTab
            name={currentTab.name}
            url={currentTab.url}
          />
        )}
      </div>
    </div>
  );
}

export default App
