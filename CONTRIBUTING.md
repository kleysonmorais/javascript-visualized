# Contributing

Thanks for your interest in contributing to JavaScript Visualized!

## Setup

```bash
# Clone the repo
git clone https://github.com/kleysonmorais/javascript-visualized.git
cd javascript-visualized

# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Run tests once (CI mode)
npm run test:run

# Run with coverage
npm run test:coverage

# Build for production
npm run build
```

## Project Structure

- `src/engine/` — the execution engine (parser + interpreter). This is where JS execution logic lives
- `src/components/` — React UI components. Each visualization panel is in `src/components/visualizer/`
- `src/types/` — all TypeScript interfaces
- `src/store/` — Zustand state management
- `src/constants/` — theme colors, code examples, palettes

## Adding a New JS Feature

1. Add the AST visitor in `src/engine/interpreter.ts` (e.g. `visitForOfStatement`)
2. Ensure it produces correct `ExecutionStep` snapshots with `memoryBlocks` and `heap`
3. Add tests in `src/engine/__tests__/`
4. The UI should render automatically (it reads from `currentStep`)

## Adding a New Code Example

1. Add the example to `src/constants/examples.ts`
2. Provide `id`, `title`, `description`, `category`, and `code`
3. Ensure the code produces meaningful visualization when run

## Code Style

- TypeScript strict mode — no `any`
- TailwindCSS for all styling — no raw CSS (except Monaco decorations and scrollbar globals)
- Framer Motion for animations
- Tests for all engine changes

## Pull Requests

- Create a feature branch from `main`
- Write or update tests
- Ensure `npm run test:run` passes
- Keep PRs focused — one feature or fix per PR
