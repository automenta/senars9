import { jest } from '@jest/globals';
import Messages from '../../core/Messages.js';

describe('Messages', () => {
  let messages;

  beforeEach(async () => {
    messages = new Messages();
    await messages.initialize({});
  });

  describe('Event Handling', () => {
    test('should register and emit an event', () => {
      const handler = jest.fn();
      messages.on('test-event', handler);
      messages.emit('test-event', { data: 'payload' });
      expect(handler).toHaveBeenCalledWith({ data: 'payload' });
    });

    test('should unregister an event handler', () => {
      const handler = jest.fn();
      messages.on('test-event', handler);
      messages.off('test-event', handler);
      messages.emit('test-event', { data: 'payload' });
      expect(handler).not.toHaveBeenCalled();
    });

    test('should handle multiple handlers for one event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      messages.on('multi-event', handler1);
      messages.on('multi-event', handler2);
      messages.emit('multi-event', 'data');
      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
    });
  });

  describe('Command Handling', () => {
    test('should register and execute a command', () => {
      const commandHandler = jest.fn(data => `executed ${data}`);
      messages.registerCommand('test-command', commandHandler);
      const result = messages.execute('test-command', 'input');
      expect(commandHandler).toHaveBeenCalledWith('input');
      expect(result).toBe('executed input');
    });

    test('should throw an error for an unknown command', () => {
      expect(() => messages.execute('unknown-command', {})).toThrow('Command "unknown-command" not found.');
    });

    test('should allow overwriting a command with a warning', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      messages.registerCommand('overwrite-cmd', handler1);
      messages.registerCommand('overwrite-cmd', handler2);
      expect(warnSpy).toHaveBeenCalledWith('Command "overwrite-cmd" is already registered. Overwriting.');
      messages.execute('overwrite-cmd', 'data');
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith('data');
      warnSpy.mockRestore();
    });
  });

  describe('Middleware', () => {
    test('should process events through middleware', () => {
      const middlewareFn = jest.fn((context, next) => {
        context.data.modified = true;
        next();
      });
      messages.use(middlewareFn);

      const handler = jest.fn();
      messages.on('event-with-middleware', handler);
      messages.emit('event-with-middleware', { original: true });

      expect(middlewareFn).toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith({ original: true, modified: true });
    });

    test('should process commands through middleware', () => {
      const middlewareFn = jest.fn((context, next) => {
        context.data = `modified ${context.data}`;
        return next();
      });
      messages.use(middlewareFn);

      const commandHandler = jest.fn(data => `final ${data}`);
      messages.registerCommand('cmd-with-middleware', commandHandler);
      const result = messages.execute('cmd-with-middleware', 'input');

      expect(middlewareFn).toHaveBeenCalled();
      expect(commandHandler).toHaveBeenCalledWith('modified input');
      expect(result).toBe('final modified input');
    });

    test('middleware can cancel an event', () => {
      const middlewareFn = (context, next) => {
        context.cancelled = true;
        next();
      };
      messages.use(middlewareFn);

      const handler = jest.fn();
      messages.on('cancelled-event', handler);
      messages.emit('cancelled-event', {});

      expect(handler).not.toHaveBeenCalled();
    });

    test('middleware can cancel a command', () => {
      const middlewareFn = (context, next) => {
        context.cancelled = true;
        // Not calling next() also stops the chain
      };
      messages.use(middlewareFn);

      const commandHandler = jest.fn();
      messages.registerCommand('cancelled-cmd', commandHandler);
      const result = messages.execute('cancelled-cmd', {});

      expect(commandHandler).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });
});