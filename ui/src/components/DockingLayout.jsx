import React from 'react';
import { Model, Layout } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import ConceptMap from './ConceptMap';
import TasksPanel from './TasksPanel';
import LogList from './LogList';
import ReasonerControlPanel from './ReasonerControlPanel';

const json = {
  global: {},
  borders: [],
  layout: {
    type: 'row',
    weight: 100,
    children: [
      {
        type: 'tabset',
        weight: 25,
        children: [
          {
            type: 'tab',
            name: 'Tasks',
            component: 'tasks-panel',
          },
        ],
      },
      {
        type: 'row',
        weight: 75,
        children: [
            {
                type: 'tabset',
                weight: 70,
                children: [
                    {
                        type: 'tab',
                        name: 'Concept Map',
                        component: 'concept-map',
                    },
                    {
                        type: 'tab',
                        name: 'Reasoner Control',
                        component: 'reasoner-control',
                    },
                ],
            },
            {
                type: 'tabset',
                weight: 30,
                children: [
                    {
                        type: 'tab',
                        name: 'Logs',
                        component: 'log-list',
                    },
                ],
            },
        ],
      },
    ],
  },
};

const model = Model.fromJson(json);

const DockingLayout = ({
  logs,
  tasks,
  concepts,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  reasonerStats,
  onCommand,
}) => {
  const factory = (node) => {
    const component = node.getComponent();
    if (component === 'concept-map') {
      return <ConceptMap concepts={concepts} />;
    }
    if (component === 'tasks-panel') {
      return (
        <TasksPanel
          tasks={tasks}
          onAddTask={onAddTask}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
        />
      );
    }
    if (component === 'log-list') {
        return <LogList logs={logs} />;
    }
    if (component === 'reasoner-control') {
      return <ReasonerControlPanel stats={reasonerStats} onCommand={onCommand} />;
    }
  };

  return <Layout model={model} factory={factory} />;
};

export default DockingLayout;
