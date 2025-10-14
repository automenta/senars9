import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GraphicsEngine from './GraphicsEngine';
import * as THREE from 'three';

// Define the spies that will be used in the mock
const mockDispose = vi.fn();
const mockForceContextLoss = vi.fn();

// Mock the 'three' module
vi.mock('three', () => ({
  WebGLRenderer: vi.fn().mockImplementation(() => ({
    setSize: vi.fn(),
    domElement: document.createElement('canvas'),
    dispose: mockDispose,
    forceContextLoss: mockForceContextLoss,
    render: vi.fn(),
  })),
  Scene: vi.fn(),
  PerspectiveCamera: vi.fn(),
  Color: vi.fn(),
}));

describe('GraphicsEngine', () => {
  beforeEach(() => {
    // Reset the state of the spies before each test
    mockDispose.mockClear();
    mockForceContextLoss.mockClear();
    THREE.WebGLRenderer.mockClear();
  });

  it('renders correctly and instantiates a renderer', () => {
    const { container } = render(<GraphicsEngine />);
    expect(container.firstChild).toBeInTheDocument();
    // Verify the mock renderer was instantiated
    expect(THREE.WebGLRenderer).toHaveBeenCalledTimes(1);
  });

  it('cleans up WebGL resources on unmount', () => {
    const { unmount } = render(<GraphicsEngine />);
    // Ensure the renderer was created before we unmount
    expect(THREE.WebGLRenderer).toHaveBeenCalledTimes(1);

    unmount();

    // Now check if the spies were called
    expect(mockDispose).toHaveBeenCalledTimes(1);
    expect(mockForceContextLoss).toHaveBeenCalledTimes(1);
  });
});
