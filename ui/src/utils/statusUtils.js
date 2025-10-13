// Consolidated status and metrics utilities for consistent styling

import { getConnectionStatusColor, getLogLevelColor } from './common';

// Status level mappings for consistent color coding
export const STATUS_LEVELS = {
  good: { color: '#28a745', bg: '#d4edda', textColor: '#155724' },
  warning: { color: '#ffc107', bg: '#fff3cd', textColor: '#856404' },
  error: { color: '#dc3545', bg: '#f8d7da', textColor: '#721c24' },
  info: { color: '#17a2b8', bg: '#d1ecf1', textColor: '#0c5460' },
  unknown: { color: '#6c757d', bg: '#f8f9fa', textColor: '#495057' }
};

// Generic status style generator
export const createStatusStyle = (level, overrides = {}) => {
  const statusConfig = STATUS_LEVELS[level] || STATUS_LEVELS.unknown;
  return {
    padding: '2px 8px',
    backgroundColor: statusConfig.bg,
    color: statusConfig.textColor,
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    ...overrides
  };
};

// System health assessment utility
export const assessSystemHealth = (stats, tasks, concepts) => {
  if (!stats) return { level: 'unknown', message: 'Unknown' };

  const { cycles } = stats;
  const taskCount = tasks.length;
  const conceptCount = concepts.length;
  const uptime = stats.timestamp ? Math.floor((Date.now() - stats.timestamp) / 1000) : 0;
  const cycleRate = uptime > 10 ? Math.round((cycles / uptime) * 100) / 100 : 0;

  if (taskCount > 100 || conceptCount > 50) {
    return { level: 'warning', message: 'High memory pressure' };
  }
  if (cycleRate > 10) {
    return { level: 'good', message: 'Active processing' };
  }
  if (cycles > 0) {
    return { level: 'good', message: 'Steady state' };
  }
  return { level: 'info', message: 'Idle' };
};

// Reasoner status assessment
export const assessReasonerStatus = (stats) => {
  if (!stats) return { level: 'unknown', message: 'Unknown' };

  if (stats.running && !stats.paused) {
    return { level: 'good', message: 'Running' };
  }
  if (stats.paused) {
    return { level: 'warning', message: 'Paused' };
  }
  return { level: 'error', message: 'Stopped' };
};

// Metrics styling patterns
export const createMetricsGridStyle = (columns = 3, gap = '8px') => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${columns}, 1fr)`,
  gap
});

export const createMetricBoxStyle = (color, bgColor = '#f1f3f4', overrides = {}) => ({
  textAlign: 'center',
  padding: '8px',
  backgroundColor: bgColor,
  borderRadius: '4px',
  value: {
    fontSize: '14px',
    fontWeight: 'bold',
    color
  },
  label: {
    fontSize: '12px',
    color: '#666'
  },
  ...overrides
});

// Chart data generation utilities
export const generateTimeSeriesData = (currentValue, points = 5, interval = 5, variance = 0.1) => {
  const data = [{ name: 'Now', value: currentValue }];
  for (let i = 1; i <= points; i++) {
    const timeLabel = `-${interval * i}s`;
    const varianceValue = (Math.random() - 0.5) * 2 * variance * currentValue;
    const value = Math.max(0, currentValue - (interval * i * 0.5) + varianceValue);
    data.unshift({ name: timeLabel, value: Math.round(value) });
  }
  return data;
};

// System metrics calculation
export const calculateSystemMetrics = (stats, tasks, concepts) => ({
  uptime: stats?.timestamp ? Math.floor((Date.now() - stats.timestamp) / 1000) : 0,
  activeTasks: tasks.length,
  concepts: concepts.length,
  cpuUsage: stats?.throttle || 100,
  memoryEstimate: (tasks.length * 0.1 + concepts.length * 0.05).toFixed(2)
});

// Color mapping for different metric types
export const METRIC_COLORS = {
  cycles: '#007bff',
  tasks: '#28a745',
  concepts: '#fd7e14',
  memory: '#6f42c1',
  cpu: '#dc3545'
};

// Generic metric display component style
export const createMetricDisplayStyle = (metricType, overrides = {}) => {
  const color = METRIC_COLORS[metricType] || '#6c757d';
  return createMetricBoxStyle(color, '#e9ecef', overrides);
};