# Repository Guidelines

## Project Structure & Module Organization
The project uses Next.js (App Router). Routes and UI live under `app/`. Key files:
- `app/page.tsx`: home page route entry.
- `app/layout.tsx`: root layout and shared wrappers.
- `app/globals.css`: global styles (imports Tailwind).
Config lives at the repo root (`next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`). TypeScript path alias `@/*` maps to the repo root.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start the local dev server at `http://localhost:3000`.
- `npm run build`: create a production build.
- `npm run start`: run the production server (after build).
- `npm run lint`: run ESLint with Next.js rules.

## Coding Style & Naming Conventions
Use TypeScript (strict mode enabled) and React function components. Keep formatting consistent with existing files; avoid tabs. Follow Next.js file naming conventions for routes (`page.tsx`, `layout.tsx`). Prefer `PascalCase` for components, `camelCase` for functions/variables, and lowercase folder names for route segments. Use `@/*` for absolute imports (example: `import Header from "@/app/Header";`).

## Testing Guidelines
No test framework is configured yet. If you add tests, create a `tests/` or `__tests__/` directory and use `*.test.ts`/`*.test.tsx` naming. Document the chosen framework and add a `npm run test` script when introduced.

## Commit & Pull Request Guidelines
There is no commit history to infer conventions. Use concise, imperative messages; consider a Conventional Commits-style prefix (e.g., `feat: add pricing section`, `fix: guard null props`). For PRs, include a clear description, link any related issues, and add screenshots or short clips for UI changes. Ensure `npm run lint` passes before requesting review.

## Configuration Notes
Runtime configuration is handled via `next.config.ts`. For secrets or environment-specific values, use `.env.local` (do not commit it).
