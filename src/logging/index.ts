/**
 * Public entry point of the logging framework.
 * Import from `src/logging` rather than reaching into individual files.
 */
export type { LogLevelName, LogRecord, LogTransport } from './types';
export {
  getLogger,
  addTransport,
  removeTransport,
  getTransportNames,
  setGlobalLevel,
  logInteraction,
  logPageView,
  buildRecord,
} from './logger';
export { ConsoleTransport } from './transports/consoleTransport';
export { LocalStorageTransport } from './transports/localStorageTransport';
export { IndexedDbTransport } from './transports/indexedDbTransport';
