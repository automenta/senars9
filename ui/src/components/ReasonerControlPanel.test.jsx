import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ReasonerControlPanel from './ReasonerControlPanel';

describe('ReasonerControlPanel', () => {
  it('renders correctly', () => {
    render(<ReasonerControlPanel stats={{}} />);
    expect(screen.getByText('Reasoner Control')).toBeInTheDocument();
  });
});
