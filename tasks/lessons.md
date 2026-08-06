# Lessons

- When a user asks for an AI skill “for building with” a library, separate installation/setup guidance from code-authoring guidance. Confirm whether the skill should teach setup, authoring, migration, or all three before drafting it.
- A UseClassy authoring skill must prioritize safe code transformation: migrate static single-modifier Tailwind tokens, preserve dynamic bindings and framework directives, and account for additive chained-modifier behavior.
- Do not assume Cursor is the only target when shipping agent resources. `SKILL.md` is a portable standard; only the install path is tool-specific. Default to `.agents/skills/` (Cursor, Codex, Copilot), append a fenced `AGENTS.md` section for everything else, and make `.claude/skills/` opt-in — Cursor also loads `.claude/skills`, so installing both duplicates the skill. Name CLI flags for the capability (`--with-skills`), not for one vendor. Skip overwriting locally edited skill files unless `--force`.
