import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InputField from './InputField';

describe('InputField', () => {
  it('renders correctly', () => {
    const { getByPlaceholderText } = render(<InputField onSend={() => {}} />);
    expect(getByPlaceholderText('Enter command or narsese... (Tab for autocomplete)')).toBeInTheDocument();
  });

  it('handles input change', () => {
    const { getByPlaceholderText } = render(<InputField onSend={() => {}} />);
    const input = getByPlaceholderText('Enter command or narsese... (Tab for autocomplete)');
    fireEvent.change(input, { target: { value: 'test command' } });
    expect(input.value).toBe('test command');
  });

  it('calls onSend when form is submitted', () => {
    const onSend = vi.fn();
    const { getByText } = render(<InputField onSend={onSend} />);
    const button = getByText('Send');
    fireEvent.click(button);
    expect(onSend).not.toHaveBeenCalled(); // a blank command shouldn't be sent

    const input = document.querySelector('input[type="text"]');
    fireEvent.change(input, { target: { value: 'test command' } });
    fireEvent.click(button);
    expect(onSend).toHaveBeenCalledWith('test command');
  });
});
