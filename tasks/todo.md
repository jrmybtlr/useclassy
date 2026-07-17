# SSR manifest robustness

## Problem

`manifestRoot` correctly places `.classy/` for Nuxt `srcDir`, but the plugin has no
SSR-aware flush hook. `transformIndexHtml` is client-only, so SSR builds can finish
transforms with a stale on-disk manifest before the first server render.

## Plan

- [x] Add shared `flushManifest` helper (write current `allClassesSet` via `writeDirect`)
- [x] Call it from `renderStart` (post-transform, works for client + SSR)
- [x] Call it from `generateBundle` (final SSR-safe write before emit)
- [x] Track SSR via `config.build.ssr` / environment consumer for debug
- [x] Prefer `writeDirect` over `writeDebounced` during builds (no debounce race)
- [x] Tests for the new hooks
- [x] Commit, push, open PR

## Review

**Fix:** After all module transforms, `renderStart` and `generateBundle` flush the
class manifest to disk. These hooks run for SSR builds (unlike `transformIndexHtml`),
so Nuxt / Vite SSR no longer relies on a client-only path for a fresh manifest.

Also uses immediate writes during builds (`scheduleManifestWrite`) so a 200ms
debounce cannot leave `.classy/output.classy.html` stale mid-build.

**Verification:** 183 unit tests passed, including new coverage for SSR `renderStart`,
`generateBundle`, and the dev-mode no-op.
