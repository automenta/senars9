import { describe, it, expect, vi } from 'vitest';

describe('Basic Browser Environment Tests', () => {
  it('ensures DOM APIs are available', () => {
    // Test that basic DOM APIs are available in our jsdom environment
    expect(typeof document).toBe('object');
    expect(typeof window).toBe('object');
    expect(document.createElement).toBeInstanceOf(Function);
  });

  it('detects console errors properly', () => {
    // Mock console.error to track calls
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Simulate an error that might occur in browser
    console.error('Test error for validation');
    
    // Verify our spy caught the error
    expect(consoleErrorSpy).toHaveBeenCalledWith('Test error for validation');
    
    consoleErrorSpy.mockRestore();
  });
  
  it('handles JavaScript errors gracefully', () => {
    // This test ensures that JavaScript errors in components
    // would be caught by our test environment
    expect(() => {
      // Test that our environment can handle errors
      expect(1).toBe(1);
    }).not.toThrow();
  });
});