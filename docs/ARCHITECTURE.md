# Architecture

## Overview

The JavaScript Visualized is split into two main layers:

1. **Engine** (`src/engine/`) — parses JavaScript code and produces an array of execution step snapshots
2. **UI** (`src/components/`) — renders the current step's state across multiple visualization panels

The engine and UI communicate through a Zustand store that holds the step array and the current step index.

## Engine

### Parser (`src/engine/parser.ts`)

Thin wrapper around [acorn](https://github.com/acornjs/acorn). Takes source code, returns an ESTree-compliant AST with location info.

### Interpreter (`src/engine/interpreter.ts`)

Custom tree walker that traverses the AST and produces `ExecutionStep[]`. Each step is a complete snapshot of:

- **Call Stack** — array of `CallStackFrame` with function names, line numbers, and assigned colors
- **Memory Blocks** — one `MemoryBlock` per active execution context (global + one per function call), each containing `MemoryEntry` items for variables
- **Heap** — array of `HeapObject` for objects, arrays, functions, Promises, and generator objects. Each has a unique color for pointer matching
- **Web APIs** — active timers and fetch requests
- **Task Queue** — macrotask callbacks waiting to execute
- **Microtask Queue** — Promise callbacks (priority over task queue)
- **Event Loop** — current phase and description
- **Console** — accumulated log entries

### Execution Model

**Synchronous code:** single-pass AST walk, generating steps for each significant operation.

**Asynchronous code (setTimeout, Promises, async/await):** two-phase approach:

1. Phase 1: execute synchronous code, register timers/promises
2. Phase 2: process async callbacks — drain microtask queue (priority), then process task queue

**Async/Await:** uses a continuation-based model. When `await` is encountered, the function's remaining statements are saved as a continuation. The frame is marked as "suspended". When the awaited Promise resolves, the continuation fires as a microtask.

**Generators:** similar to async — `yield` saves a continuation, `.next()` resumes it.

### Memory Tracking

The interpreter maintains two parallel systems:

1. **Environment** — real runtime values for expression evaluation
2. **Memory visualization** — `MemoryBlock[]` + `HeapObject[]` for display

Both stay in sync: every environment change updates the corresponding memory representation.

**Key rules:**

- Primitives → stored inline in MemoryEntry (`displayValue: "42"`)
- Functions → `ⓕ` symbol pointing to HeapObject with source code
- Objects/Arrays → `[Pointer]` pointing to HeapObject with properties
- Reference copy (`b = a`) → same `heapReferenceId` and `pointerColor`
- Closures → `[[Scope]]` on function HeapObjects capturing enclosing variables

## UI

### Layout (`src/components/layout/`)

- `Navbar` — project name, examples dropdown, GitHub link
- `AppShell` — CSS Grid layout fitting 100vh, no page scroll

### Visualization (`src/components/visualizer/`)

Each panel reads from `currentStep` via Zustand:

| Component            | Reads                   | Key feature                                        |
| -------------------- | ----------------------- | -------------------------------------------------- |
| `CallStack`          | `callStack`             | Color-coded frames                                 |
| `MemoryPanel`        | `memoryBlocks` + `heap` | Local/global memory + heap with pointers           |
| `MemoryBlockCard`    | single `MemoryBlock`    | `ⓕ`, `[Pointer]`, primitives                       |
| `HeapSection`        | `heap`                  | Objects, functions, `[[Scope]]`, Promise internals |
| `WebAPIs`            | `webAPIs`               | Timer/fetch cards with progress                    |
| `TaskQueue`          | `taskQueue`             | FIFO horizontal list                               |
| `MicrotaskQueue`     | `microtaskQueue`        | FIFO horizontal list (emerald border)              |
| `EventLoopIndicator` | `eventLoop`             | Phase-aware spinner                                |
| `ConsoleOutput`      | `console`               | Terminal-style log                                 |

### State (`src/store/`)

Single Zustand store managing: source code, execution steps, step navigation, playback state, and hover state for memory interactions.

### Color System

**Frame ↔ Memory:** each Call Stack frame and its MemoryBlock share the same border color (from `FRAME_COLORS` palette). Global is always amber.

**Pointer ↔ Heap:** memory entries referencing heap objects share the same badge color (from `POINTER_COLORS` palette). Same color = same reference.

## Testing

Vitest with ~200+ tests covering:

- Parser (valid/invalid code)
- Synchronous execution (variables, functions, control flow, objects)
- Memory tracking (primitives, ⓕ, pointers, reference sharing, local/global memory lifecycle)
- Async execution (setTimeout ordering, Task Queue, Event Loop phases)
- Promises (creation, .then chaining, microtask priority, .catch/.finally)
- Async/Await (suspension, resumption, fetch, try/catch)
- Closures (capture, persistence, mutation)
- Classes (constructors, this binding, extends/super)
- Generators (yield, persistent memory, for...of)
- Advanced (destructuring, spread, template literals)

## File Structure

```
src/
├── components/
│   ├── layout/        # Navbar, AppShell
│   ├── editor/        # CodeEditor (Monaco wrapper)
│   ├── visualizer/    # All visualization panels
│   ├── controls/      # TransportControls
│   └── ui/            # Panel, reusable components
├── engine/
│   ├── __tests__/     # All engine tests
│   ├── parser.ts      # acorn wrapper
│   ├── interpreter.ts # Main execution engine
│   ├── promise.ts     # Internal promise tracking
│   └── index.ts       # Public API (generateSteps)
├── types/             # All TypeScript interfaces
├── store/             # Zustand store
├── hooks/             # useAutoPlay, useKeyboardShortcuts
├── constants/         # Theme, examples, color palettes
└── lib/               # Utilities, helpers
```
