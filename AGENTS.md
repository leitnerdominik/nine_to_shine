# Coding Agent Orchestration

This repository uses a lead-and-workers coding-agent workflow. The goal is to keep architectural decisions centralized while still allowing safe parallel implementation.

## Default agent topology

| Role | Model | Reasoning effort | Default use |
| --- | --- | --- | --- |
| Lead / Orchestrator | GPT-5.6 Sol | High | Understand requests, inspect affected code, freeze contracts, split work, integrate results |
| Backend Builder | GPT-5.6 Sol | Medium | ASP.NET Core, EF Core, PostgreSQL, migrations, backend tests |
| Frontend Builder | GPT-5.6 Sol | Medium | Next.js, React, TypeScript, MUI, forms, DTOs, frontend tests |
| Reviewer | GPT-5.6 Sol | High | Independent review of the integrated diff and test evidence |
| Test / Fix Runner | GPT-5.6 Luna | Medium | Run verification, diagnose mechanical failures, make non-semantic fixes |

Use only the agents needed for the task. A small isolated change should normally use one builder and one reviewer. A substantial cross-stack feature may use both builders in parallel after the contract is frozen.

## Effort escalation

- **Low**: formatting, imports, renames, tiny isolated edits.
- **Medium**: normal implementation, tests, controllers, React work, well-understood bugs.
- **High**: planning, architecture, independent review, ambiguous cross-stack work, difficult debugging.
- **Extra High / xhigh**: complex migrations, concurrency, financial consistency, authorization, deep refactors, or production-only failures.
- **Max**: exceptional fallback only when the problem has resisted lower efforts and further search is justified.

Do not spend High or higher reasoning on routine mechanical implementation once the behavior and contract are already clear.

## Authority model

The **Lead / Orchestrator owns architecture and integration**. Builders do not independently change cross-stack contracts.

The lead must resolve, before parallel work begins:

1. expected user-visible behavior;
2. affected backend and frontend areas;
3. API request/response contracts;
4. persistence and migration requirements;
5. authorization and validation requirements;
6. acceptance criteria and required tests.

If a builder discovers that the frozen contract is unsafe or impossible, it must report the conflict to the lead instead of silently redesigning the feature.

## Required workflow

### 1. Inspect before editing

Read the affected implementation, DTOs, tests, and nearby patterns. Prefer extending existing conventions over introducing new abstractions.

### 2. Freeze the task contract

For non-trivial work, the lead writes a compact task contract containing:

- behavior;
- backend contract;
- frontend behavior;
- persistence implications;
- authorization/validation rules;
- test cases;
- files or areas each builder owns.

Use `.agents/TASK_TEMPLATE.md` as the handoff format.

### 3. Isolate builders

Each coding agent works on its own branch/worktree. Builders do not merge their own work. The lead owns integration.

Recommended naming:

```text
agent/<task>/backend
agent/<task>/frontend
agent/<task>/review-fixes
```

Avoid having two builders edit the same file concurrently. If both stacks need a shared contract change, the lead defines it first and assigns ownership explicitly.

### 4. Integrate, then review

Review the combined vertical change, not only individual builder patches. The reviewer should receive:

- original requirement;
- frozen task contract;
- integrated diff;
- verification results.

The reviewer should not assume builder reasoning is correct.

### 5. Verify

Backend:

```bash
cd nine_to_shine_backend
dotnet build
dotnet test
```

Frontend:

```bash
cd nine_to_shine_frontend
npm run lint
npm run build
npm test
```

Do not change expected business behavior merely to make a failing test pass. Semantic failures go back to the lead or relevant builder.

## Cross-stack rules

- Never change an API contract implicitly.
- Backend response/request changes must update the matching frontend DTOs and callers.
- Database schema changes require an EF Core migration.
- Never rewrite an existing committed migration; add a new one.
- Preserve Firebase authentication and authorization behavior unless the task explicitly changes it.
- Treat finance, balances, ranking rules, and organizer rotation as high-risk business logic.
- Financial calculations belong in decimal-safe backend logic; do not rely on frontend floating-point calculations as the source of truth.
- Validate malformed or unauthorized requests on the backend even when the frontend also validates them.
- Prefer stable IDs and explicit contracts over coupling UI behavior to display text or ordering.

## Review priorities

The independent reviewer should actively look for:

1. incomplete requirement coverage;
2. frontend/backend DTO drift;
3. authorization regressions;
4. validation holes;
5. EF/data-integrity issues;
6. concurrency problems;
7. incorrect money calculations;
8. date/time edge cases;
9. React state/loading/error bugs;
10. regression risk in ranking and organizer rotation;
11. missing negative-path tests;
12. unnecessary abstractions or duplication.

Classify findings as `BLOCKER`, `HIGH`, `MEDIUM`, or `LOW`.

## Test / Fix Runner limits

The test/fix agent may repair mechanical failures such as imports, type errors, stale mocks, formatting/lint issues, and obvious fixture breakage caused by the patch.

It must not:

- change business expectations just to make tests green;
- weaken authorization or validation;
- alter a frozen API contract;
- edit migrations to hide schema problems;
- suppress meaningful warnings without explaining the cause.

Escalate those failures to the lead.
