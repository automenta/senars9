import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ConnectionTab from './components/ConnectionTab';

// This integration test serves as a "smoke test" for the ConceptMap component.
// It verifies that the component, along with its complex three.js GraphicsEngine,
// can be rendered into the DOM without causing any runtime errors.

describe('ConceptMap Component - Integration Test', () => {
  it('renders the graphics canvas without errors', async () => {
    // Render the parent component that contains the ConceptMap
    const { container } = render(<ConnectionTab name="Test Connection" url="ws://localhost:8080" />);

    // The most important thing to verify is that rendering the component
    // does not throw any exceptions, which would be caught by vitest.

    // As a secondary check, we can look for the <canvas> element that
    // the GraphicsEngine (three.js) should have created and appended to the DOM.
    // We wait for it to ensure any async setup in GraphicsEngine has completed.
    const canvasElement = await new Promise(resolve => {
      setTimeout(() => {
        const canvas = container.querySelector('canvas');
        resolve(canvas);
      }, 1000); // Give it a second for three.js to initialize
    });

    // Assert that the canvas element was found in the document
    expect(canvasElement).not.toBeNull();
    expect(canvasElement).toBeInTheDocument();
  });
});
