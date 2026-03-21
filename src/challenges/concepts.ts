import type { RuntimeConcept } from './types';

interface ConceptConfig {
  label: string;
  color: string;
}

export const CONCEPT_CONFIG: Record<RuntimeConcept, ConceptConfig> = {
  'call-stack':       { label: 'Call Stack',       color: '#f59e0b' },
  'global-memory':    { label: 'Global Memory',    color: '#f59e0b' },
  'local-memory':     { label: 'Local Memory',     color: '#a855f7' },
  'heap':             { label: 'Heap',             color: '#a855f7' },
  'web-apis':         { label: 'Web APIs',         color: '#a855f7' },
  'task-queue':       { label: 'Task Queue',       color: '#ec4899' },
  'microtask-queue':  { label: 'Microtask Queue',  color: '#10b981' },
  'event-loop':       { label: 'Event Loop',       color: '#06b6d4' },
  'console':          { label: 'Console',          color: '#6b7280' },
  'closures':         { label: 'Closures',         color: '#a855f7' },
  'promises':         { label: 'Promises',         color: '#3b82f6' },
  'async-await':      { label: 'Async/Await',      color: '#3b82f6' },
  'generators':       { label: 'Generators',       color: '#14b8a6' },
};
