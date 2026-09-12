# Agent Task Contract

Use this document as the frozen handoff between the Lead / Orchestrator and implementation agents.

## Task

**Title:**

**Original request:**

## Expected behavior

- 

## Architecture decision

Describe the chosen approach and any important constraints. Keep this short and explicit.

## Backend contract

### Endpoints

```text
METHOD /api/...
```

### Request

```json
{}
```

### Response

```json
{}
```

### Validation / authorization

- 

### Persistence

- Existing schema only / new migration required
- Entities or tables affected:
- Concurrency implications:

## Frontend behavior

- Pages/components affected:
- Loading state:
- Empty state:
- Error state:
- Success state:
- Validation:

## Ownership

### Backend Builder

May edit:

```text
nine_to_shine_backend/...
```

Must not edit:

```text
nine_to_shine_frontend/...
```

### Frontend Builder

May edit:

```text
nine_to_shine_frontend/...
```

Must not edit:

```text
nine_to_shine_backend/...
```

If only one builder is needed, remove the unused section.

## Acceptance criteria

- [ ]
- [ ]

## Required tests

### Backend

- [ ] happy path
- [ ] validation failure
- [ ] unauthorized/forbidden path where applicable
- [ ] not-found path where applicable
- [ ] relevant business-rule edge cases

### Frontend

- [ ] happy path
- [ ] validation state
- [ ] API failure state
- [ ] loading/disabled behavior where applicable

## Verification

```bash
cd nine_to_shine_backend
dotnet build
dotnet test

cd ../nine_to_shine_frontend
npm run lint
npm run build
npm test
```

## Builder blocker protocol

If implementation reveals that this contract is unsafe, inconsistent with the current architecture, or impossible without changing behavior, do not silently redesign it.

Return:

```text
BLOCKER
Current constraint:
Why the contract fails:
Evidence from the repository:
Suggested change:
Impact:
```

The Lead / Orchestrator decides whether to revise the contract.
