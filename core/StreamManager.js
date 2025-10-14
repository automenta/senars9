import { WebSocketUtils, DEFAULTS, MESSAGE_TYPES, STREAM_TYPES } from './WebSocketUtils.js';

class StreamManager {
  constructor(webSocketServer) {
    this.wss = webSocketServer;
    this.taskStreams = new Map();
    this.streams = new Map();
  }

  createTaskStream(taskId, options = {}) {
    if (this.taskStreams.has(taskId)) {
      return this.taskStreams.get(taskId);
    }

    const stream = {
      id: taskId,
      participants: new Set(),
      history: [],
      options: {
        bufferSize: options.bufferSize || DEFAULTS.TASK_STREAM_BUFFER_SIZE,
        retentionTime: options.retentionTime || DEFAULTS.RETENTION_TIME,
        streamType: options.streamType || STREAM_TYPES.TASK
      },
      createdAt: new Date(),
      isActive: true
    };

    this.taskStreams.set(taskId, stream);
    return stream;
  }

  subscribeToTaskStream(clientId, taskId) {
    const stream = this.taskStreams.get(taskId) || this.createTaskStream(taskId);
    stream.participants.add(clientId);

    if (stream.history.length > 0) {
      const historyMessage = WebSocketUtils.createMessage(
        MESSAGE_TYPES.TASK_STREAM_HISTORY,
        {
          taskId,
          history: stream.history.slice(-DEFAULTS.TASK_HISTORY_LIMIT)
        }
      );
      this.wss.sendToClient(clientId, historyMessage);
    }

    return true;
  }

  publishTaskUpdate(taskId, updateData) {
    const stream = this.taskStreams.get(taskId);
    if (!stream?.isActive) return false;

    const update = {
      type: 'update',
      data: updateData,
      timestamp: new Date(),
      action: updateData.action || 'update'
    };

    stream.history.push(update);

    if (stream.history.length > stream.options.bufferSize) {
      stream.history = stream.history.slice(-stream.options.bufferSize);
    }

    const updateMessage = WebSocketUtils.createMessage(
      MESSAGE_TYPES.TASK_STREAM_UPDATE,
      { taskId, update: updateData }
    );

    for (const participantId of stream.participants) {
      this.wss.sendToClient(participantId, updateMessage);
    }

    return true;
  }

  unsubscribeFromTaskStream(clientId, taskId) {
    const stream = this.taskStreams.get(taskId);
    if (stream) {
      stream.participants.delete(clientId);
    }
  }

  createStream(streamId, streamType, options = {}) {
    if (this.streams.has(streamId)) {
      return this.streams.get(streamId);
    }

    const stream = {
      id: streamId,
      type: streamType,
      participants: new Set(),
      buffer: [],
      bufferSize: options.bufferSize || DEFAULTS.STREAM_BUFFER_SIZE,
      createdAt: new Date(),
      isActive: true
    };

    this.streams.set(streamId, stream);
    return stream;
  }

  subscribeToStream(clientId, streamId, streamType, options = {}) {
    const fullStreamId = `${streamType}:${streamId}`;
    const stream = this.streams.get(fullStreamId) || this.createStream(fullStreamId, streamType, options);

    stream.participants.add(clientId);

    const confirmMessage = WebSocketUtils.createMessage(
      MESSAGE_TYPES.STREAM_SUBSCRIPTION_CONFIRMED,
      { streamId: fullStreamId, status: 'success' }
    );
    this.wss.sendToClient(clientId, confirmMessage);

    WebSocketUtils.debug(`Client ${clientId} subscribed to stream ${fullStreamId}`);
  }

  unsubscribeFromStream(clientId, streamId) {
    for (const [fullStreamId, stream] of this.streams) {
      if (stream.participants.has(clientId)) {
        stream.participants.delete(clientId);

        if (stream.participants.size === 0 && stream.id === streamId) {
          this.streams.delete(fullStreamId);
        }
      }
    }

    const confirmMessage = WebSocketUtils.createMessage(
      MESSAGE_TYPES.STREAM_UNSUBSCRIBED,
      { streamId, status: 'success' }
    );
    this.wss.sendToClient(clientId, confirmMessage);

    WebSocketUtils.debug(`Client ${clientId} unsubscribed from stream ${streamId}`);
  }

  publishToStream(clientId, streamId, data) {
    const stream = this.streams.get(streamId);
    if (!stream?.isActive) {
      const errorMessage = WebSocketUtils.createMessage(
        MESSAGE_TYPES.STREAM_ERROR,
        { streamId, error: 'Stream not found or inactive' }
      );
      this.wss.sendToClient(clientId, errorMessage);
      return false;
    }

    const streamData = {
      source: clientId,
      data,
      timestamp: new Date()
    };

    stream.buffer.push(streamData);

    if (stream.buffer.length > stream.bufferSize) {
      stream.buffer = stream.buffer.slice(-stream.bufferSize);
    }

    const dataMessage = WebSocketUtils.createMessage(
      MESSAGE_TYPES.STREAM_DATA,
      { streamId, data, source: clientId }
    );

    for (const participantId of stream.participants) {
      if (participantId !== clientId) {
        this.wss.sendToClient(participantId, dataMessage);
      }
    }

    return true;
  }

  broadcastToStreamType(clientId, streamType, data) {
    for (const [fullStreamId, stream] of this.streams) {
      if (stream.type === streamType && stream.isActive) {
        this.publishToStream(clientId, stream.id, data);
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

  handleTaskStreamMessage(clientId, message) {
    const { taskId, action, data, streamType = STREAM_TYPES.TASK } = message;

    const stream = this.taskStreams.get(taskId) || this.createTaskStream(taskId, { streamType });
    stream.participants.add(clientId);

    const historyEntry = {
      clientId,
      action,
      data,
      timestamp: new Date()
    };
    stream.history.push(historyEntry);

    const broadcastMessage = WebSocketUtils.createMessage(MESSAGE_TYPES.TASK_UPDATE, {
      taskId,
      source: clientId,
      action,
      data,
      streamType
    });

    this.wss.broadcast(broadcastMessage, [clientId]);
  }

  handleStreamRequest(clientId, message) {
    const { streamId, action, data, streamType } = message;

    const actionHandlers = {
      'subscribe': () => this.subscribeToStream(clientId, streamId, streamType, data),
      'unsubscribe': () => this.unsubscribeFromStream(clientId, streamId),
      'publish': () => this.publishToStream(clientId, streamId, data),
      'broadcast': () => this.broadcastToStreamType(clientId, streamType, data)
    };

    const handler = actionHandlers[action];
    if (handler) {
      handler();
    } else {
      WebSocketUtils.warn(`Unknown streaming action: ${action}`);
    }
  }

  getStats() {
    const subscriptionStats = this.getSubscriptionStats();
    const totalStreamParticipants = Array.from(this.streams.values())
      .reduce((sum, stream) => sum + stream.participants.size, 0);

    return {
      taskStreams: this.taskStreams.size,
      totalStreams: this.streams.size,
      totalStreamParticipants,
      subscriptionStats
    };
  }

  getSubscriptionStats() {
    return Array.from(this.wss.subscriptions.values())
      .flatMap(sub => Array.from(sub.eventTypes))
      .reduce((counts, eventType) => {
        counts[eventType] = (counts[eventType] || 0) + 1;
        return counts;
      }, {});
  }

  cleanup() {
    this.taskStreams.clear();
    this.streams.clear();
  }

  // Event publishing for external components
  publishEvent(eventType, data, filters = {}) {
    const eventMessage = WebSocketUtils.createMessage(MESSAGE_TYPES.EVENT, {
      eventType,
      data,
      filters
    });

    for (const [clientId, subscription] of this.wss.subscriptions) {
      if (this.matchesSubscription(subscription, eventType, filters) &&
          this.wss.clients.has(clientId)) {
        this.wss.sendToClient(clientId, eventMessage);
      }
    }
  }

  matchesSubscription(subscription, eventType, eventFilters) {
    const hasEventType = subscription.eventTypes.has(eventType) || subscription.eventTypes.has('*');
    if (!hasEventType) return false;

    return WebSocketUtils.checkEventFilters(subscription.filters, eventFilters);
  }
}

export default StreamManager;