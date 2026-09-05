# Lessons

## Nitro cannot load Vite `?raw` (2026-08-23)

- `import x from 'file.md?raw'` works in Vite (app code) and fails in Nitro (`ENOENT …/README.md?raw`).
- Do not `readFileSync` that path at Worker runtime either. Inline the file at config time via `nitro.virtual`.
- Do not name the virtual module `#something`. Node treats `#` as `package.json` `imports`, so an unresolved specifier crashes every request with `Package import specifier "#…" is not defined`. Use `virtual:…`.

## Shiki `.line` plus `whitespace-pre` double-spaces (2026-08-23)

- Shiki emits `<span class="line">…</span>\n<span class="line">`.
- `whitespace-pre-wrap` on the parent preserves those newlines, and `.line { display: block }` adds another break — every source line looks blank-separated.
- Collapse inter-span newlines (`>\n<` → `><`), keep `white-space: normal` on the `<code>`, and put `white-space: pre-wrap` on `.line` so wrapping still works.

## Nested async Vue setup hides children (2026-08-23)

- `await useAsyncData(...)` in a child (`DocsCodeFence`) makes the component async. Without a parent `<Suspense>`, Vue can skip those nodes on the client after hydration.
- Docs headings/paragraphs stay visible; every fenced `CodeBlock` disappears.
- Keep setup sync: call `useAsyncData` without `await`, always render the chrome, and fall back to escaped code until highlight resolves.

## Horizontal scroller must not use scrollIntoView (2026-08-22)

- `scrollIntoView({ inline: 'center', block: 'nearest' })` still scrolls the window vertically when the active token is off-screen or only partly visible.
- Pan the overflow-x pane with `scrollLeft` / `pane.scrollTo({ left })` only. Never let the autoplay tour steal page scroll.

## Canvas backing store vs layout size (2026-08-22)

- Never size a canvas buffer from `clientWidth` inside a `ResizeObserver` on that same canvas unless CSS `width`/`height` are set.
- `canvas.width` / `canvas.height` are intrinsic size. Without `w-dvw h-dvh` (or `size-full`), the element grows with the buffer, the observer fires again, and the tab OOMs (white crash / sad-tab).
- Size from `window.innerWidth` / `innerHeight`, lock CSS size, and listen to `window.resize` instead.

## Particle bursts must stack, not evict (2026-08-22)

- Never `shift()` live particles to make room for a new click burst. That looks like the effect “resets.”
- Raise the cap and skip new spawns when full. Existing embers should keep flying until they fade or leave the screen.

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
- Do not assume Cursor is the only target when shipping agent resources. `SKILL.md` is a portable standard; only the install path is tool-specific. Default to `.agents/skills/` (Cursor, Codex, Copilot), append a fenced `AGENTS.md` section for everything else, and make `.claude/skills/` opt-in — Cursor also loads `.claude/skills`, so installing both duplicates the skill. Name CLI flags for the capability (`--with-skills` / `--no-skills`), not for one vendor. Default agent skill install on `init` (opt out with `--no-skills`) so agents actually see the syntax; keep `.claude/skills/` opt-in. Skip overwriting locally edited skill files unless `--force`.

- For AI/LLM discoverability of a library: ship a rich `/llms.txt` (when-to-use, syntax, anti-patterns, agent install), expose the authoring skill at a stable public URL (`/skill.md`), add `/.well-known/llms.txt`, include those routes in `robots.txt` + `sitemap.xml`, and put AI-related npm keywords/`description` plus a README "For AI assistants" table. Defaulting agent skill install on `init` is the in-repo half of the same problem.

- When adding Context7 support: ship a root `context7.json` (exclude demos/build noise, add agent `rules`), document the one-time submit at context7.com/add-library (GitHub repo + public llms.txt), and claim ownership so refreshes are controllable. Do not put claiming `public_key` in the repo until the owner generates it in the Context7 UI.

- Context7 CI: use refresh on every main push; only call add/repo when refresh returns 404. Do not submit on every push (409 once indexed). Soft-skip when `CONTEXT7_API_KEY` is missing so forks/PRs stay green.
