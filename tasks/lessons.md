# Lessons

## Vue template whitespace-only spans (2026-08-20)

- Vue’s default `whitespace: 'condense'` strips space-only text nodes, including `<span> </span>`.
- CLI highlighter tokens need `{{ ' ' }}` (or a token `v-for` with `text: ' '`) so `composer require …` does not render as `composerrequire…`.

## Vite 8 dep scan parses JSX before plugin transforms (2026-08-20)

- Vite 8’s Rolldown optimizer scan does **not** run Vite `transform` hooks. It parses `.tsx` / `.jsx` first.
- `className:hover` is valid namespaced JSX (one colon). `className:sm:hover` is not, and Rolldown fails the scan.
- Rewrite chained modifiers via `optimizeDeps.rolldownOptions.plugins` (and `ssr.optimizeDeps`) so the scanner sees merged `className` attributes.

## ClassExample autoplay pause target (2026-08-22)

- Pause the hero line tour only while the pointer is over the `<code>` panes, not the whole ClassExample.
- Tab clicks focus Vue/React/Svelte/Blade buttons. Container-level `pointerenter` / `focusin` froze the cycle after a format switch.
- Do not treat chrome (tabs, copy, wrap) as “inside the demo.”

## Hero CodeBlock tabs are left-aligned (2026-08-20)

- Vue / React / Svelte / Blade tabs in the hero example sit left, not centered. Do not add `justify-center` on the CodeBlock tablist.

## Oxc formatter picker name (2026-08-20)

- Cursor’s “Format Document With” / default formatter list shows **Oxc**, not “oxcfmt”.
- Oxc only appears after the oxfmt language server starts. Point `oxc.path.oxfmt` at `node_modules/oxfmt/bin/oxfmt` (the Node entry, not the pnpm `.bin` shell shim) and run **Oxc: Restart oxfmt Server** (or reload the window) after installing the package.

## pnpm lockfile-only installs (2026-08-20)

- `pnpm add -w` can print `Lockfile only installation will make it out-of-date` and leave workspace `node_modules` half-linked.
- That breaks the Vue demo (`Cannot find module .../nuxt/bin/nuxt.mjs`). Follow with a real `pnpm install` so packages like Nuxt are relinked.

## Marketing live examples (2026-08-20)

- Additive vs exact live cases belong in the existing ClassExample (the source/expanded snippets in the hero window), not a new landing-page section.
- Do not invent a Semantics (or similar) section when the user points at that demo.

## Plugin smoke demos (2026-08-19)

- Do not rewrite UseClassy smoke demos into a polished fictional product UI (Harbor-style inbox, design-system cards, etc.) unless the user has approved a mock after seeing it.
- Coverage pages can stay labeled and a bit clinical; that is easier to scan than a realistic layout that hides the cases. Prefer smaller visual cleanup (copy, titles, spacing) over a full scene rewrite.

## JSX conditional class rewrites (2026-07-21)

- When rewriting string literals inside `className:modifier={…}`, never blindly prefix every quoted string.
- Comparison operands (`===` / `!==` / `==` / `!=`) and string method receivers (`'x'.includes`) must stay untouched.
- Always add a regression test for `status === 'active' ? 'bg-a' : 'bg-b'` when changing the JSX expression rewriter.

- When a user asks for an AI skill "for building with" a library, separate installation/setup guidance from code-authoring guidance. Confirm whether the skill should teach setup, authoring, migration, or all three before drafting it.
- A UseClassy authoring skill must prioritize safe code transformation: migrate static Tailwind variant tokens (including chained prefixes such as `sm:hover:`), and preserve dynamic bindings and framework directives.
- Do not assume Cursor is the only target when shipping agent resources. `SKILL.md` is a portable standard; only the install path is tool-specific. Default to `.agents/skills/` (Cursor, Codex, Copilot), append a fenced `AGENTS.md` section for everything else, and make `.claude/skills/` opt-in — Cursor also loads `.claude/skills`, so installing both duplicates the skill. Name CLI flags for the capability (`--with-skills`), not for one vendor. Skip overwriting locally edited skill files unless `--force`.
