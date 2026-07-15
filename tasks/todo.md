# Issue #36: Manifest written too late for Tailwind

## Review summary

**Valid bug** against published `vite-plugin-useclassy@3.1.0`.

Tailwind v4 reads `.classy/output.classy.html` via `@source` while CSS compiles.
Published 3.1.0 only wrote that file in `buildEnd`, so the first cold `vite build`
missed UseClassy variants (`md:h-40`). A second build worked because the first
left a manifest behind.

## Fix (this PR)

- [x] Run project/blade scan on `buildStart` in **dev and build**
- [x] Pass instance `writeDirect` into early scan (triggers `onWrote`)
- [x] Invalidate CSS modules after manifest writes in Dev (HMR)
- [x] Allowlist the manifest in `.classy/.gitignore` so Oxide can read `@source`
- [x] Use function-based Vite watch ignore for `.classy/` (avoid HTML full reload)
- [x] Tests for early scan + CSS invalidation + gitignore allowlist
- [x] Commit, push, open PR (#37)

## Verification

- Fresh `vite build` with empty `.classy/` includes variant classes in CSS (reproduced on react demo: `md:text-7xl`)
- Published 3.1.0 still fails first build; local fix succeeds
- Unit tests: 179 passed
- CI checks green on PR head

## Review (post-implementation)

Verified against reproduction matching issue #36:

1. **Cold `vite build`** with empty `.classy/`: CSS includes `md:h-40` on the first run.
2. **Dev HMR**: adding `class:hover="text-pink-500"` updates the manifest and the
   Tailwind CSS (`?direct`) without a full page reload.
3. Published 3.1.0 still writes only at `buildEnd` and fails the cold build.

Root causes addressed:
- Manifest was written too late for Tailwind's CSS pass → early `buildStart` scan.
- Dev updates did not refresh Tailwind → `handleHotUpdate` + CSS invalidation.
- Nested `.classy/.gitignore` of `*` blocked Oxide → allowlist the manifest file.
