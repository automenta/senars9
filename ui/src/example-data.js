// ui/src/example-data.js

import { randomUUID } from 'crypto';

export const initialTasks = [
  { id: randomUUID(), content: '<robin --> bird>.', priority: 0.9, status: 'Pending', type: 'Input' },
  { id: randomUUID(), content: 'What is a bird?', priority: 0.8, status: 'Pending', type: 'Question' },
  { id: randomUUID(), content: '(<#x> --> bird) && (<#x> --> animal)?', priority: 0.7, status: 'In-Progress', type: 'Goal' },
  { id: randomUUID(), content: 'Analyze the latest sensor data', priority: 0.6, status: 'Pending', type: 'Operation' },
  { id: randomUUID(), content: 'fly. Inh.', priority: 0.5, status: 'Pending', type: 'Input' },
  { id: randomUUID(), content: 'Write end-to-end tests', priority: 0.3, status: 'Pending', type: 'Operation' },
];

export const initialConcepts = [
  { id: randomUUID(), content: 'Artificial General Intelligence' },
  { id: randomUUID(), content: 'Emergent Behavior' },
  { id: randomUUID(), content: 'bird' },
  { id: randomUUID(), content: 'robin' },
];

export const initialLogs = [
  { id: randomUUID(), message: 'System boot initiated' },
  { id: randomUUID(), message: 'Core modules loaded' },
  { id: randomUUID(), message: 'Initial knowledge base populated.' },
];
