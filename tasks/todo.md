# Svelte language support

`.svelte` is already in `SUPPORTED_FILES`, but there is no `language: 'svelte'` option and no dedicated Svelte regexes (Vue regexes include a `:class` lookahead that is Vue-specific).

## Plan

- [x] Add `SVELTE_CLASS_REGEX` / `SVELTE_CLASS_MODIFIER_REGEX` in `core.ts` (quoted UseClassy modifiers only; preserve native `class:name={cond}`)
- [x] Add `language?: 'svelte'` to `ClassyOptions`; wire selection in `index.ts`
- [x] Update CLI + `init-setup` (`INIT_LANGUAGES`, help text, VS Code patterns)
- [x] Tests for Svelte transform + native directive preservation
- [x] README: document Svelte usage
- [x] Run tests, commit, push, open PR

## Review

**Done.** Added first-class Svelte support:

1. Dedicated `SVELTE_CLASS_REGEX` / `SVELTE_CLASS_MODIFIER_REGEX` — no Vue `:class` lookahead; quoted UseClassy modifiers only so native `class:active={cond}` / `class:active` stay intact.
2. `language: 'svelte'` on `ClassyOptions`, plugin wiring, CLI (`--language svelte`), and init setup.
3. Tests cover transform, native-directive preservation, and `class={\`...\`}` static extraction.
4. README documents Svelte config and usage.

Verification: 184 tests passed; `npm run build` succeeds.
