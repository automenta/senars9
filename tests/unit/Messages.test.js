import { jest } from '@jest/globals';
import Messages from '../../core/Messages.js';

describe('Messages Component', () => {
  let messages;

  beforeEach(async () => {
    messages = new Messages();
    await messages.initialize();
  });

  test('should register and emit an event', () => {
    const handler = jest.fn();
    messages.on('test.event', handler);
    messages.emit('test.event', { payload: 'data' });

    expect(handler).toHaveBeenCalledWith({ payload: 'data' });
  });

  test('should unregister an event handler', () => {
    const handler = jest.fn();
    messages.on('test.event', handler);
    messages.off('test.event', handler);
    messages.emit('test.event', { payload: 'data' });

    expect(handler).not.toHaveBeenCalled();
  });

  test('should register and execute a command', () => {
    const commandHandler = jest.fn(data => `executed ${data}`);
    messages.registerCommand('test.command', commandHandler);
    const result = messages.execute('test.command', 'payload');

    expect(commandHandler).toHaveBeenCalledWith('payload');
    expect(result).toBe('executed payload');
  });

  test('should throw an error for a non-existent command', () => {
    expect(() => {
      messages.execute('non.existent.command');
    }).toThrow('Command "non.existent.command" not found.');
  });

  test('should process events and commands through middleware', () => {
    const middlewareFn = jest.fn((context, next) => {
      context.data.modified = true;
      next();
    });

    messages.use(middlewareFn);

    const eventHandler = jest.fn();
    messages.on('middleware.event', eventHandler);
    messages.emit('middleware.event', { payload: 'original' });

    expect(middlewareFn).toHaveBeenCalled();
    expect(eventHandler).toHaveBeenCalledWith({
      payload: 'original',
      modified: true,
    });
  });

  test('should allow middleware to cancel an event', () => {
    const middlewareFn = jest.fn((context, next) => {
      context.cancelled = true;
      next();
    });

    messages.use(middlewareFn);

    const eventHandler = jest.fn();
    messages.on('cancelled.event', eventHandler);
    messages.emit('cancelled.event', {});

    expect(middlewareFn).toHaveBeenCalled();
    expect(eventHandler).not.toHaveBeenCalled();
  });
});