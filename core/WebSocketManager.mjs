// Unified WebSocket manager - works for both browser and Node.js
// Re-export from the main implementation location
export { default as WebSocketManager } from '../ui/src/utils/WebSocketConnectionManager';

// For direct imports, users should import from the main location
// This file is kept for backward compatibility only