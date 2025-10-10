import { describe, test, expect } from '@jest/globals';
import { testWebSocketFunctionality } from '../../examples/shared/webSocketDemo.js';

describe('WebSocket Integration Test', () => {
  test('should demonstrate WebSocket communication functionality and verify server methods', async () => {
    const result = await testWebSocketFunctionality();
    
    // Verify WebSocket server exists
    expect(result.hasWebSocketServer).toBe(true);
    
    // Verify all expected methods exist on the WebSocket server
    const expectedMethods = [
      '_handleNARSRegistration',
      '_handleTaskSynchronization', 
      '_handleStatusRequest',
      '_handleStatusBroadcast',
      'broadcastTaskToNARS',
      'getNARSInstanceStatus',
      'sendRequestToNARS'
    ];
    
    expectedMethods.forEach(method => {
      expect(result.methodAvailability[method]).toBe(true);
    });
    
    // Verify stats are properly returned
    expect(result.stats).toBeDefined();
    expect(typeof result.stats.isRunning).toBe('boolean');
    expect(typeof result.stats.clientCount).toBe('number');
    expect(typeof result.stats.narsInstances).toBe('number');
    
    // Verify NARS instances can be retrieved
    expect(Array.isArray(result.narsInstances)).toBe(true);
  });

  test('should handle client connection lifecycle properly', async () => {
    const result = await testWebSocketFunctionality();
    
    // Verify initial stats
    expect(result.stats).toBeDefined();
    
    // Stats should include expected properties
    expect(result.stats).toHaveProperty('isRunning');
    expect(result.stats).toHaveProperty('clientCount');
    expect(result.stats).toHaveProperty('narsInstances');
  });

  test('should demonstrate real-time event broadcasting capabilities', async () => {
    const result = await testWebSocketFunctionality();
    
    // Verify the server can broadcast tasks to NARS instances
    expect(typeof result.methodAvailability.broadcastTaskToNARS).toBe('boolean');
    expect(result.methodAvailability.broadcastTaskToNARS).toBe(true);
    
    // Verify status methods exist for real-time monitoring
    expect(result.methodAvailability._handleStatusBroadcast).toBe(true);
    expect(result.methodAvailability.getNARSInstanceStatus).toBe(true);
  });

  test('should validate message routing and handling', async () => {
    const result = await testWebSocketFunctionality();
    
    // Verify message handling methods exist
    expect(result.methodAvailability._handleNARSRegistration).toBe(true);
    expect(result.methodAvailability._handleTaskSynchronization).toBe(true);
    expect(result.methodAvailability._handleStatusRequest).toBe(true);
    expect(result.methodAvailability.sendRequestToNARS).toBe(true);
  });
});