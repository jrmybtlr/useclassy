# Sync framework selection

## Plan

- [x] Lift shared framework state in `app.vue`
- [x] Wire ClassExample via v-model; map blade ↔ laravel for init control
- [x] Drive manual Vite `language:` from shared state
- [x] Verify sync across hero / quick / manual

## Review

- Shared `demoFormat` drives hero tabs, init CLI (blade↔laravel), and manual `language:`
- Verified: Svelte hero → Svelte init + `language: 'svelte'`; Blade hero → Laravel init selected
