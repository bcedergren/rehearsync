# CLAUDE.md — Engineering Rules for RehearSync

These rules are mandatory. They override all default behavior. If a request conflicts with these rules, refuse and ask for clarification.

---

## Core Principles

- **Minimal, surgical changes only.** Touch only what is explicitly requested. Nothing more.
- **Do not anticipate needs.** Do not add features, refactor surrounding code, or make "improvements" beyond the stated task.
- **Preserve existing patterns.** Match the conventions already in use — naming, structure, formatting, error handling. Do not introduce new patterns unless explicitly asked.
- **Ask, don't guess.** If the intent is ambiguous, stop and ask for clarification. Do not infer, assume, or improvise.

## Safety Constraints

- **Never delete, overwrite, or remove existing code** unless explicitly instructed to do so.
- **Never rename or reorganize files** unless explicitly instructed.
- **Never modify dependencies** (`package.json`, `pnpm-lock.yaml`, etc.) unless explicitly asked.
- **Never modify configuration files** (`tsconfig.json`, `next.config.*`, `.env*`, `supabase/config.toml`, etc.) unless explicitly asked.
- **Never modify CI/CD pipelines, deployment configs, or infrastructure** unless explicitly asked.
- **Never run destructive git commands** (`push --force`, `reset --hard`, `branch -D`, `checkout .`) without explicit confirmation.
- **Never commit or push** unless explicitly asked. Staged changes require user approval before committing.

## Change Management

- **Incremental edits over rewrites.** Use targeted edits. Do not rewrite entire files when a few lines will do.
- **No scope creep.** If fixing a bug, fix that bug. Do not clean up adjacent code, add types, update comments, or refactor while you're there.
- **One concern per change.** Each edit should address exactly one thing. Do not bundle unrelated modifications.
- **Read before writing.** Always read relevant files before proposing or making changes. Understand the existing code first.
- **Verify before acting.** Confirm file paths, function signatures, and variable names from the actual codebase. Do not rely on memory or assumptions.

## Code Quality

- **Match existing style exactly.** Indentation, quotes, semicolons, naming conventions — follow what is already there.
- **Do not add comments, docstrings, or type annotations** to code you did not change.
- **Do not add error handling, validation, or fallbacks** beyond what the task requires.
- **Do not create abstractions, helpers, or utilities** for one-time operations.
- **Do not add logging, telemetry, or diagnostics** unless explicitly asked.
- **Do not introduce new libraries or packages** unless explicitly asked.

## File System Rules

- **Do not create new files** unless the task absolutely requires it. Prefer editing existing files.
- **Do not create documentation files** (README, CHANGELOG, etc.) unless explicitly requested.
- **Do not move, rename, or reorganize files or directories.**
- **Do not modify `.gitignore`, `.eslintrc`, `.prettierrc`, or similar tooling configs** unless explicitly asked.

## Communication

- **Be concise.** Lead with the action or answer. Skip preamble and filler.
- **Do not summarize what you just did** unless asked. The diff speaks for itself.
- **Do not explain code you didn't change.**
- **When uncertain, ask.** A short clarifying question is always better than an incorrect assumption.
- **Report blockers immediately.** If something prevents you from completing the task as described, say so and stop.

## Absolute Rules

These are non-negotiable. Violation of any of these requires immediate correction:

1. **Never exceed the scope of the explicit request.**
2. **Never delete or overwrite code without explicit instruction.**
3. **Never modify dependencies or configs without explicit instruction.**
4. **Never rename or reorganize files without explicit instruction.**
5. **Never commit, push, or create PRs without explicit instruction.**
6. **Never introduce new patterns, libraries, or architectural changes without explicit instruction.**
7. **When in doubt, stop and ask.**

---

*These rules exist to prevent overreach. Follow them exactly.*
