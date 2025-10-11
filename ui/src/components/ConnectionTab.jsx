import React from 'react';
import { Layout, Model } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import ReasonerControlPanel from './ReasonerControlPanel';
import InputField from './InputField';
import LogList from './LogList';
import TasksTree from './TasksTree';
import ConceptMap from './ConceptMap';
import Panel from './Panel';
import useWebSocket from '../core/WebSocketManager';
import { MESSAGE_TYPES, THEME } from '../constants';

const ConnectionTab = ({ name, url }) => {
  const { isConnected, messages, error, sendMessage } = useWebSocket(url);

  const json = {
    global: {},
    layout: {
      "type": "row",
      "weight": 100,
      "children": [
        {
          "type": "tabset",
          "weight": 50,
          "selected": 0,
          "children": [
            {
              "type": "tab",
              "name": "Concept Map",
              "component": "concept-map",
            }
          ]
        },
        {
          "type": "tabset",
          "weight": 50,
          "selected": 0,
          "children": [
            {
              "type": "tab",
              "name": "Tasks",
              "component": "tasks",
            },
            {
              "type": "tab",
              "name": "Log",
              "component": "log",
            }
          ]
        }
      ]
    },
    borders: [
      {
        "type": "border",
        "location": "top",
        "size": 40,
        "children": [
          {
            "type": "tab",
            "name": "Reasoner Control",
            "component": "reasoner-control",
            "enableClose": false
          }
        ],
        "enableTabStrip": false
      },
      {
        "type": "border",
        "location": "bottom",
        "size": 40,
        "children": [
          {
            "type": "tab",
            "name": "Input",
            "component": "input-field",
            "enableClose": false
          }
        ],
        "enableTabStrip": false
      }
    ]
  };

  const model = Model.fromJson(json);

  const handleSendMessage = (command) => {
    sendMessage({ type: 'command', data: command });
  };

  const filteredLogMessages = messages.filter(msg => msg.type === MESSAGE_TYPES.log);
  const filteredTaskMessages = messages.filter(msg => msg.type === MESSAGE_TYPES.task);
  const filteredConceptMessages = messages.filter(msg => msg.type === MESSAGE_TYPES.concept);
  const reasonerStats = messages.find(msg => msg.type === MESSAGE_TYPES.reasonerStats)?.data || null;

  const factory = (node) => {
    const component = node.getComponent();
    const title = node.getName();
    switch (component) {
      case 'concept-map':
        return <Panel title={title}><ConceptMap concepts={filteredConceptMessages} /></Panel>;
      case 'tasks':
        return <Panel title={title}><TasksTree tasks={filteredTaskMessages} /></Panel>;
      case 'log':
        return <Panel title={title}><LogList logs={filteredLogMessages} /></Panel>;
      case 'reasoner-control':
        return <Panel title={title}><ReasonerControlPanel stats={reasonerStats} /></Panel>;
      case 'input-field':
        return <Panel title={title}><InputField onSend={handleSendMessage} /></Panel>;
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
    <div className="connection-tab" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={connectionStatusStyles}>
        <strong>Connection:</strong> {name} ({url}) - Status: {isConnected ? 'Connected' : 'Disconnected'}
      </div>

      {error && (
        <div style={errorStyles}>
          <strong>Error:</strong> {error.message}
        </div>
      )}

      <div style={{ position: "relative", flex: "1" }}>
        <Layout
          model={model}
          factory={factory}
        />
      </div>
    </div>
  );
};

export default ConnectionTab;
