# Glimps Frontend

Vite + React + TypeScript SPA for Glimps personal image library.

## Development

The harness repo (`glimps/`) runs all services via Docker Compose. See the harness [AGENTS.md](../AGENTS.md) for the standard development workflow.

**Via Docker Compose:**
```bash
cd glimps
docker compose up -d
# Frontend available at http://localhost:3010
```

**Local iteration (debugging only):**
```bash
cp .env.example .env
pnpm install
pnpm run dev
```

## Commands

| Command | Context | Purpose |
|---------|---------|---------|
| `pnpm run lint` | docker exec or local | ESLint |
| `pnpm run typecheck` | docker exec or local | TypeScript |
| `pnpm run test` | docker exec or local | Vitest |
| `pnpm run build` | docker exec or local | Production build |
| `pnpm run preview` | local only | Preview production build |

## Stack

- Vite 6 + React 18 + TypeScript 5
- React Router (future)
- Vitest for tests
- ESLint + typescript-eslint