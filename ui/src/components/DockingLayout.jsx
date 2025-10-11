import React from 'react';
import { Model, Layout } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import ConceptMap from './ConceptMap';
import TasksTree from './TasksTree';
import LogList from './LogList';

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
            component: 'tasks-tree',
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

const DockingLayout = ({ logs, tasks, concepts }) => {
  const factory = (node) => {
    const component = node.getComponent();
    if (component === 'concept-map') {
      return <ConceptMap concepts={concepts} />;
    }
    if (component === 'tasks-tree') {
      return <TasksTree tasks={tasks} />;
    }
    if (component === 'log-list') {
        return <LogList logs={logs} />;
    }
  };

  return <Layout model={model} factory={factory} />;
};

export default DockingLayout;
