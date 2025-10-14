import { WebSocketUtils, MESSAGE_TYPES } from './WebSocketUtils.js';

class MessageHandler {
  constructor(webSocketServer) {
    this.wss = webSocketServer;
    this.handlers = new Map();
    this._registerDefaultHandlers();
  }

  _registerDefaultHandlers() {
    this.register('identify', this._handleIdentify.bind(this));
    this.register('heartbeat', this._handleHeartbeat.bind(this));
    this.register('subscribe', this._handleSubscription.bind(this));
    this.register('unsubscribe', this._handleUnsubscription.bind(this));
    this.register('task_stream', this._handleTaskStream.bind(this));
    this.register('stream_request', this._handleStreaming.bind(this));
    this.register('subscribe_to_task', this._handleTaskSubscription.bind(this));
    this.register('unsubscribe_from_task', this._handleTaskUnsubscription.bind(this));
    this.register('command', this._handleCommand.bind(this));
  }

  register(type, handler) {
    this.handlers.set(type, handler);
  }

  unregister(type) {
    this.handlers.delete(type);
  }

  handle(clientId, message) {
    const handler = this.handlers.get(message.type);

    if (handler) {
      handler(clientId, message);
    } else {
      this._handleCustomMessage(clientId, message);
    }
  }

  _handleIdentify(clientId, message) {
    const client = this.wss.clients.get(clientId);
    if (!client) return;

    Object.assign(client, {
      type: message.clientType || 'unknown',
      version: message.version || 'unknown',
      capabilities: message.capabilities || []
    });

    WebSocketUtils.debug(`Client ${clientId} identified as: ${client.type} (v${client.version})`);
  }

  _handleHeartbeat(clientId, message) {
    // Heartbeat response - no action needed
  }

  _handleSubscription(clientId, message) {
    const { eventTypes = [], filters = {} } = message;

    if (!this.wss.subscriptions.has(clientId)) {
      this.wss.subscriptions.set(clientId, {
        eventTypes: new Set(),
        filters: {},
        subscribedAt: new Date()
      });
    }

    const subscription = this.wss.subscriptions.get(clientId);
    eventTypes.forEach(eventType => subscription.eventTypes.add(eventType));
    Object.assign(subscription.filters, filters);
    subscription.lastUpdated = new Date();

    this.wss.sendToClient(clientId, WebSocketUtils.createMessage(
      MESSAGE_TYPES.SUBSCRIPTION_CONFIRMED,
      { eventTypes: Array.from(subscription.eventTypes) }
    ));
  }

  _handleUnsubscription(clientId, message) {
    const { eventTypes = [] } = message;

    if (!this.wss.subscriptions.has(clientId)) return;

    const subscription = this.wss.subscriptions.get(clientId);

    if (eventTypes.length === 0) {
      this.wss.subscriptions.delete(clientId);
    } else {
      eventTypes.forEach(eventType => subscription.eventTypes.delete(eventType));
      if (subscription.eventTypes.size === 0) {
        this.wss.subscriptions.delete(clientId);
      }
    }
  }

  _handleTaskStream(clientId, message) {
    const { taskId, action, data, streamType = 'task' } = message;

    if (!this.wss.taskStreams.has(taskId)) {
      this.wss.taskStreams.set(taskId, {
        id: taskId,
        streamType,
        participants: new Set(),
        history: [],
        createdAt: new Date(),
        isActive: true
      });
    }

    const stream = this.wss.taskStreams.get(taskId);
    stream.participants.add(clientId);
    stream.history.push({
      clientId,
      action,
      data,
      timestamp: new Date()
    });

    this.wss.broadcast(WebSocketUtils.createMessage(MESSAGE_TYPES.TASK_UPDATE, {
      taskId,
      source: clientId,
      action,
      data,
      streamType
    }), [clientId]);
  }

  _handleStreaming(clientId, message) {
    const { streamId, action, data, streamType } = message;

    const actionHandlers = {
      'subscribe': () => this._handleStreamSubscription(clientId, streamId, streamType, data),
      'unsubscribe': () => this._handleStreamUnsubscription(clientId, streamId),
      'publish': () => this._handleStreamPublish(clientId, streamId, data),
      'broadcast': () => this._handleStreamBroadcast(clientId, streamType, data)
    };

    const handler = actionHandlers[action];
    if (handler) {
      handler();
    } else {
      WebSocketUtils.warn(`Unknown streaming action: ${action}`);
    }
  }

  _handleTaskSubscription(clientId, message) {
    this.wss.subscribeToTaskStream(clientId, message.taskId);
    this.wss.sendToClient(clientId, WebSocketUtils.createMessage(
      MESSAGE_TYPES.SUBSCRIPTION_SUCCESS,
      { taskId: message.taskId }
    ));
  }

  _handleTaskUnsubscription(clientId, message) {
    const stream = this.wss.taskStreams.get(message.taskId);
    if (stream) stream.participants.delete(clientId);
  }

  _handleCommand(clientId, message) {
    const { command, data } = message;

    if (!this.wss.core?.messages) {
      WebSocketUtils.warn('Core messages component not available - command ignored');
      this.wss.sendToClient(clientId, WebSocketUtils.createErrorResponse(
        message.command || 'unknown',
        new Error('Core not available')
      ));
      return;
    }

    const commandMap = {
      'start': 'cycle.start',
      'stop': 'cycle.stop',
      'pause': 'cycle.pause',
      'resume': 'cycle.resume',
      'step': 'cycle.step',
      'reset': 'cycle.reset',
      'throttle': 'cycle.throttle'
    };

    const internalCommand = commandMap[command];

    if (!internalCommand) {
      WebSocketUtils.warn(`Unknown command: ${command}`);
      return;
    }

    try {
      this._executeCommand(internalCommand, data);
      this.wss.sendToClient(clientId, WebSocketUtils.createSuccessResponse(command));
    } catch (error) {
      WebSocketUtils.error(`Error executing command ${internalCommand}:`, error);
      this.wss.sendToClient(clientId, WebSocketUtils.createErrorResponse(command, error));
    }
  }

  _executeCommand(command, data) {
    if (command === 'cycle.throttle' && data && this.wss.core.cycle) {
      WebSocketUtils.debug(`Throttle request: ${data.value}%`);
    } else if (command === 'cycle.reset' && this.wss.core.cycle) {
      this.wss.core.cycle.cycleCount = 0;
      this.wss.core.messages.emit('cycle.stats', {
        cycles: this.wss.core.cycle.cycleCount,
        timestamp: Date.now()
      });
    } else {
      this.wss.core.messages.execute(command, data);
    }
  }

  _handleStreamSubscription(clientId, streamId, streamType, options = {}) {
    if (!this.wss.streams) this.wss.streams = new Map();

    const fullStreamId = `${streamType}:${streamId}`;

    if (!this.wss.streams.has(fullStreamId)) {
      this.wss.streams.set(fullStreamId, {
        id: fullStreamId,
        type: streamType,
        participants: new Set(),
        buffer: [],
        bufferSize: options.bufferSize || 100,
        createdAt: new Date(),
        isActive: true
      });
    }

    const stream = this.wss.streams.get(fullStreamId);
    stream.participants.add(clientId);

    this.wss.sendToClient(clientId, WebSocketUtils.createMessage(
      MESSAGE_TYPES.STREAM_SUBSCRIPTION_CONFIRMED,
      { streamId: fullStreamId, status: 'success' }
    ));

    WebSocketUtils.debug(`Client ${clientId} subscribed to stream ${fullStreamId}`);
  }

  _handleStreamUnsubscription(clientId, streamId) {
    if (!this.wss.streams) return;

    for (const [fullStreamId, stream] of this.wss.streams) {
      if (stream.participants.has(clientId)) {
        stream.participants.delete(clientId);
        if (stream.participants.size === 0 && stream.id === streamId) {
          this.wss.streams.delete(fullStreamId);
        }
      }
    }

    this.wss.sendToClient(clientId, WebSocketUtils.createMessage(
      MESSAGE_TYPES.STREAM_UNSUBSCRIBED,
      { streamId, status: 'success' }
    ));

    WebSocketUtils.debug(`Client ${clientId} unsubscribed from stream ${streamId}`);
  }

  _handleStreamPublish(clientId, streamId, data) {
    if (!this.wss.streams) return;

    const stream = this.wss.streams.get(streamId);
    if (!stream || !stream.isActive) {
      this.wss.sendToClient(clientId, WebSocketUtils.createMessage(
        MESSAGE_TYPES.STREAM_ERROR,
        { streamId, error: 'Stream not found or inactive' }
      ));
      return;
    }

    stream.buffer.push({
      source: clientId,
      data,
      timestamp: new Date()
    });

    if (stream.buffer.length > stream.bufferSize) {
      stream.buffer = stream.buffer.slice(-stream.bufferSize);
    }

    for (const participantId of stream.participants) {
      if (participantId !== clientId) {
        this.wss.sendToClient(participantId, WebSocketUtils.createMessage(
          MESSAGE_TYPES.STREAM_DATA,
          { streamId, data, source: clientId }
        ));
      }
    }
  }

  _handleStreamBroadcast(clientId, streamType, data) {
    if (!this.wss.streams) return;

    for (const [fullStreamId, stream] of this.wss.streams) {
      if (stream.type === streamType && stream.isActive) {
        this._handleStreamPublish(clientId, stream.id, data);
      }
    }

    if (this.wss.core?.messages?.emit) {
      this.wss.core.messages.emit(`stream.broadcast.${streamType}`, {
        source: clientId,
        data,
        streamType,
        timestamp: new Date().toISOString()
      });
    }
  }

  _handleCustomMessage(clientId, message) {
    this.wss.emit('message', {
      clientId,
      clientType: this.wss.clients.get(clientId)?.type,
      message,
      timestamp: new Date()
    });
  }
}

export default MessageHandler;