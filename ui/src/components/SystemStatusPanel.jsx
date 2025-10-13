import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { panelContainerStyle, headerStyle, statBoxStyle, labelStyle, statusBadgeStyle } from '../utils/styling';
import {
  assessSystemHealth,
  calculateSystemMetrics,
  generateTimeSeriesData,
  createStatusStyle,
  createMetricsGridStyle,
  createMetricBoxStyle,
  METRIC_COLORS
} from '../utils/statusUtils';

const SystemStatusPanel = ({ stats, connectionStatus, tasks = [], concepts = [] }) => {
  const systemMetrics = calculateSystemMetrics(stats, tasks, concepts);
  const health = assessSystemHealth(stats, tasks, concepts);

  // Generate chart data using utility
  const cyclesData = generateTimeSeriesData(stats?.cycles || 0, 5, 5, 0.2).map(d => ({ ...d, cycles: d.value }));
  const tasksData = generateTimeSeriesData(tasks.length, 5, 5, 0.3).map(d => ({ ...d, tasks: d.value }));

  return (
    <div style={{...panelContainerStyle({ height: '100%', display: 'flex', flexDirection: 'column' }), border: '1px solid #ddd' }}>
      <h3 style={headerStyle({ margin: '0 0 12px 0', fontSize: '14px', color: '#333', paddingBottom: '6px' })}>
        System Status
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div style={statBoxStyle()}>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Connection</div>
          <div style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: getConnectionStatusColor(connectionStatus)
          }}>
            {connectionStatus?.toUpperCase()}
          </div>
        </div>

        <div style={statBoxStyle()}>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Health</div>
          <div style={createStatusStyle(health.level)}>
            {health.message}
          </div>
        </div>
      </div>

      <div style={createMetricsGridStyle(3, '8px')}>
        {[
          { key: 'cycles', value: stats?.cycles || 0, color: METRIC_COLORS.cycles },
          { key: 'tasks', value: tasks.length, color: METRIC_COLORS.tasks },
          { key: 'concepts', value: concepts.length, color: METRIC_COLORS.concepts }
        ].map(({ key, value, color }) => (
          <div key={key} style={createMetricBoxStyle(color)}>
            <div style={createMetricBoxStyle().value}>{value}</div>
            <div style={createMetricBoxStyle().label}>{key.charAt(0).toUpperCase() + key.slice(1)}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Cycles Trend</div>
        <div style={{ height: '60px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cyclesData}>
              <Area type="monotone" dataKey="cycles" stroke="#007bff" fill="#007bff30" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Tasks Trend</div>
        <div style={{ height: '60px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tasksData}>
              <Area type="monotone" dataKey="tasks" stroke="#28a745" fill="#28a74530" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ fontSize: '10px', color: '#666', marginTop: 'auto' }}>
        <div>Uptime: {systemMetrics.uptime}s</div>
        <div>Est. Memory: {systemMetrics.memoryEstimate}MB</div>
      </div>
    </div>
  );
};

export default SystemStatusPanel;