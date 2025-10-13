import React from 'react';
import { Model, Layout } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import ConceptMap from './ConceptMap';
import TasksPanel from './TasksPanel';
import LogList from './LogList';
import SystemStatusPanel from './SystemStatusPanel';

// Component registry for better maintainability
const COMPONENT_REGISTRY = {
  'concept-map': {
    component: ConceptMap,
    props: (props) => ({ concepts: props.concepts, tasks: props.tasks })
  },
  'tasks-panel': {
    component: TasksPanel,
    props: (props) => ({
      tasks: props.tasks,
      memoryTasks: props.memoryTasks,
      onUpdateTask: props.onUpdateTask,
      onDeleteTask: props.onDeleteTask
    })
  },
  'concepts-panel': {
    component: React.lazy(() => import('./ConceptsPanel')),
    props: (props) => ({
      concepts: props.concepts,
      onUpdateConcept: props.onUpdateTask,
      onDeleteConcept: props.onDeleteTask
    }),
    isLazy: true,
    fallback: 'Loading concepts...'
  },
  'log-list': {
    component: LogList,
    props: (props) => ({ logs: props.logs })
  },
  'system-status': {
    component: SystemStatusPanel,
    props: (props) => ({
      stats: props.reasonerStats,
      connectionStatus: props.connectionStatus,
      tasks: props.tasks,
      concepts: props.concepts
    })
  }
};

// Layout configuration
const LAYOUT_CONFIG = {
  global: {
    tabEnableClose: false,
    tabEnableRename: false,
  },
  borders: [],
  layout: {
    type: 'row',
    weight: 100,
    children: [
      {
        type: 'tabset',
        weight: 25,
        enableTabStrip: true,
        selected: 0,
        children: [
          { type: 'tab', name: 'Tasks', component: 'tasks-panel' },
          { type: 'tab', name: 'Concepts', component: 'concepts-panel' }
        ]
      },
      {
        type: 'row',
        weight: 75,
        children: [
          {
            type: 'tabset',
            weight: 70,
            children: [
              { type: 'tab', name: 'Concept Map', component: 'concept-map' }
            ]
          },
          {
            type: 'tabset',
            weight: 30,
            children: [
              { type: 'tab', name: 'Logs', component: 'log-list' },
              { type: 'tab', name: 'System', component: 'system-status' }
            ]
          }
        ]
      }
    ]
  }
};

// Component factory with error handling and lazy loading
const createComponentFactory = (props) => (node) => {
  const componentKey = node.getComponent();

  if (!COMPONENT_REGISTRY[componentKey]) {
    console.warn(`Unknown component type: ${componentKey}`);
    return <div>Unknown component: {componentKey}</div>;
  }

  const { component: Component, props: propMapper, isLazy, fallback } = COMPONENT_REGISTRY[componentKey];

  try {
    const componentProps = propMapper ? propMapper(props) : props;

    if (isLazy) {
      const LazyComponent = Component;
      return (
        <React.Suspense fallback={<div>{fallback}</div>}>
          <LazyComponent {...componentProps} />
        </React.Suspense>
      );
    }

    return <Component {...componentProps} />;
  } catch (error) {
    console.error(`Error rendering component ${componentKey}:`, error);
    return <div>Error loading {componentKey}</div>;
  }
};

const DockingLayout = (props) => {
  const model = Model.fromJson(LAYOUT_CONFIG);
  const factory = createComponentFactory(props);

  return <Layout model={model} factory={factory} />;
};

export default DockingLayout;
