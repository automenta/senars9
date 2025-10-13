import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';
import { UIProvider } from './core/UIContext';
import { NotificationProvider } from './core/NotificationSystem';

// Wrapper component that includes all necessary providers
const TestWrapper = ({ children }) => (
  <UIProvider>
    <NotificationProvider>
      {children}
    </NotificationProvider>
  </UIProvider>
);

describe('Populated UI Verification Test', () => {
  it('renders the main application container', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );
    const appContainer = screen.getByTestId('app-container');
    expect(appContainer).toBeInTheDocument();
  });

  it('renders without crashing', () => {
    expect(() => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );
    }).not.toThrow();
  });
});
