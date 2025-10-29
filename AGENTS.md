# Repository Guidelines

## Project Structure & Module Organization
Keep React UI code inside `src/`. Components live in `src/components/`, shared styling in `src/App.css` and `src/index.css`, service clients such as `alpacaApi.ts` and `elevenLabsAgent.ts` sit in `src/services/`, and shared types belong in `src/types/`. Static assets are grouped under `src/assets/`, while `public/` holds files served verbatim by Vite. Automation scripts and one-off utilities go in `scripts/` (e.g. `scripts/migrate-data.ts`). Supabase configuration and database assets are maintained in `supabase/` and should mirror any backend schema changes.

## Build, Test, and Development Commands
Use `npm run dev` to launch the Vite development server with hot reload. Run `npm run build` for a production output (TypeScript project references compile first, then Vite bundles). Execute `npm run preview` to sanity-check the production build locally. Maintain lint hygiene with `npm run lint`, which applies ESLint to all source files.

## Coding Style & Naming Conventions
This project targets modern TypeScript React. Prefer functional components with hooks and keep files in PascalCase (`AccountOverview.tsx`) or kebab-case for utilities (`use-account-store.ts`). Use 2-space indentation, trailing commas where valid, and favor explicit return types for exported functions. Run ESLint before committing; configuration lives in `eslint.config.js` and extends the core React/Vite recommendations.

## Testing Guidelines
Automated tests are not yet wired into `package.json`. When contributing, add Vitest-based specs colocated beside the implementation (`Component.test.tsx`) or under `src/__tests__/`. Aim to cover business logic in `src/services/` and any reducers or hooks, and exercise UI flows with Testing Library. Document any new test commands in `package.json` and update this guide when they are available.

## Commit & Pull Request Guidelines
Follow the concise, imperative style already in the log (`fixed keys`, `changed from vin to finagent`). Scope commits narrowly and include context in the body when touching APIs or migrations. Pull requests should link to their issue, describe functional changes, list new environment variables, and attach UI screenshots or screencasts for visual updates. Request at least one peer review for feature work and confirm that lint/build checks pass before assigning reviewers.

## Environment & Security Notes
Secrets and API keys belong in a local `.env` file and should be exposed to Vite as `VITE_*` variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Never commit `.env` files or Supabase service keys. When editing `supabase/` migrations, run `supabase db lint` (via the Supabase CLI) before submitting changes and coordinate deploys with backend maintainers.
