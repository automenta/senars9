import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LogList from './LogList';

describe('LogList', () => {
  it('renders correctly with no logs', () => {
    render(<LogList logs={[]} />);
    expect(screen.getByText('No log messages yet...')).toBeInTheDocument();
  });

  it('renders a list of logs', () => {
    const logs = [
      { data: 'log message 1' },
      { data: 'log message 2' },
    ];
    render(<LogList logs={logs} />);
    expect(screen.getByText('log message 1')).toBeInTheDocument();
    expect(screen.getByText('log message 2')).toBeInTheDocument();
  });
});
