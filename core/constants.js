// Shared constants across the system
export const DEFAULTS = {
  FOCUS_SIZE: 50,
  ATTENTION_DECAY: 0.9,
  PRIORITY_LEVELS: 10,
  QUERY_LIMIT: 100,
  ACCESS_WEIGHT: 100,
  DECAY_HOURS: 24,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  BACKOFF_MULTIPLIER: 2,
  MIDDLEWARE_TIMEOUT: 5000,
  MESSAGE_TIMEOUT: 10000,
  MAX_HISTORY_SIZE: 100,
};

export const STATES = {
  UNINITIALIZED: 'uninitialized',
  INITIALIZED: 'initialized',
  RUNNING: 'running',
  STOPPED: 'stopped',
  DESTROYED: 'destroyed',
};

export const COMPLEXITY_LEVELS = { simple: 1, medium: 2, complex: 3 };
export const MAX_PRIORITY = 10;

export const RETRYABLE_ERRORS = [
  'TimeoutError',
  'NetworkError',
  'ConnectionError',
  'TemporaryFailure',
  'RateLimitError',
];

export const MESSAGE_TYPES = {
  COMMAND: 'command',
  EVENT: 'event',
};

export const STORAGE_NAMESPACES = {
  DEFAULT: 'storage',
  EVENTS: 'events',
  COMMANDS: 'commands',
  PROCESSORS: 'processors',
  ERROR_HANDLERS: 'errorHandlers',
  RETRY_POLICIES: 'retryPolicies',
};