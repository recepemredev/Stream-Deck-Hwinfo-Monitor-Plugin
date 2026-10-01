# Contributing

Thanks for your interest! Forks and pull requests are both welcome.

## Workflow

1. **Fork** the repository and clone your fork.
2. Create a branch from `main`: `git checkout -b feat/my-change`.
3. Install and verify: `npm install`, then `npm run typecheck` and `npm test`.
4. Make your change, with tests for anything in `src/`.
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:` …), one logical change per commit.
6. Push and open a **pull request** that describes what changed and how you tested it (ideally on a real Stream Deck).

## Code style

- **One responsibility per function and module.** Keep the layers separate: `hwinfo` → `metrics` / `alerts` / `settings` / `render` → `actions`. Only `src/plugin.ts` creates concrete dependencies.
- **No duplicated logic.** If two blocks look alike, extract one parameterized function instead.
- **Validate at the edge.** All Property Inspector input goes through `src/settings/`; the rest of the code trusts validated types.
- **Keep rendering pure.** `src/render/` turns a model into an SVG string with no side effects.
- Tabs for indentation, LF line endings (see `.editorconfig`), and `.js` extensions in TypeScript imports.
- Comments explain *why*, not *what*. Skip comments that repeat the code.
- Don't add dependencies unless they are clearly needed. The plugin ships with a single runtime dependency (`koffi`).

## Reporting bugs

Please open an issue with your Windows, Stream Deck app and HWiNFO versions, the device model, what you expected and what happened. Relevant lines from the plugin log help a lot (see the README's troubleshooting section).
