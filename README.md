# Glimps Frontend

Vite + React + TypeScript SPA for Glimps personal image library.

## Tool Requirements

- **Node.js** 22+
- **pnpm** 9+

## Quick Start

```bash
cp .env.example .env
pnpm install
pnpm run dev
```

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm run dev` | Start dev server |
| `pnpm run build` | Production build |
| `pnpm run preview` | Preview production build |
| `pnpm run lint` | ESLint |
| `pnpm run typecheck` | TypeScript |
| `pnpm run test` | Vitest |

## "Works at All" Test

```bash
pnpm install
pnpm run build
```

Build must succeed with no errors.

## Service Description

Frontend SPA connects to the Glimps backend API. Dev server runs on port 5173 (Vite default).

## Stack

- Vite 6 + React 18 + TypeScript 5
- React Router (future)
- Vitest for tests
- ESLint + typescript-eslint