/**
 * @file: tests/unit/Tools.test.js
 * @description: Unit tests for the Tools component.
 */

import { jest } from '@jest/globals';
import Tools from '../../core/Tools.js';

describe('Tools Component', () => {
  let tools;
  let mockTool;

  beforeEach(async () => {
    tools = new Tools();

    mockTool = {
      id: 'mock-tool',
      description: 'A tool for testing.',
      parameters: [{ name: 'param1', required: true }],
      execute: jest.fn().mockResolvedValue('tool result'),
    };

    await tools.initialize();
    tools.registerTool(mockTool);
  });

  test('should register a tool', () => {
    const availableTools = tools.getAvailableTools();
    expect(availableTools.length).toBe(1);
    expect(availableTools[0].id).toBe('mock-tool');
  });

  test('should execute a tool with correct parameters', async () => {
    const result = await tools.execute('mock-tool', { param1: 'value' });
    expect(mockTool.execute).toHaveBeenCalledWith({ param1: 'value' });
    expect(result).toBe('tool result');
  });

  test('should throw an error if a required parameter is missing', async () => {
    await expect(tools.execute('mock-tool', {})).rejects.toThrow('Missing required parameter "param1" for tool "mock-tool".');
  });

  test('should throw an error if tool is not found', async () => {
    await expect(tools.execute('nonexistent-tool')).rejects.toThrow('Tool "nonexistent-tool" not found.');
  });

  test('should throw an error if tool registration is invalid', () => {
    expect(() => tools.registerTool({ id: 'invalid' })).toThrow('tool.execute must be function, got undefined');
  });

  test('should handle tool execution errors', async () => {
    const error = new Error('Tool failed');
    mockTool.execute.mockRejectedValue(error);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(tools.execute('mock-tool', { param1: 'value' })).rejects.toThrow('Tool failed');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error executing tool "mock-tool":', error);

    consoleErrorSpy.mockRestore();
  });
});