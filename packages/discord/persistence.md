# Discord Session Persistence

Persist Discord sessions across bot restarts.

---

## Problem

Sessions are stored only in memory (`Map<string, SessionData>`) and lost on every bot restart. The help text incorrectly claims persistence exists.

---

## Goals

- Persist session metadata to disk
- Automatically re-attach to existing opencode sessions on startup
- Clean up stale sessions periodically
- Maintain backward compatibility

---

## Design

### Data Storage

Store session mappings in JSON at `~/.config/opencode/discord-sessions.json`:

```json
{
  "version": 1,
  "sessions": {
    "discord:guild:channel:user": {
      "sessionId": "abc123",
      "channelId": "123456",
      "userId": "789",
      "lastActivity": "2026-02-21T12:00:00Z"
    }
  }
}
```

### Key Components

**1. Persistence Store (`src/persistence/store.ts`)**

- Load/save session mappings
- Atomic writes (write to temp file, then rename)
- Handle file corruption gracefully

**2. Modified Session Manager (`src/utils/session.ts`)**

- Load persisted sessions on startup
- When creating session, check if sessionId exists in persistence
- Start opencode server with `--session <id>` flag to attach
- Update lastActivity on every message

**3. Session Recovery (`src/persistence/recovery.ts`)**

- On bot startup: iterate persisted sessions
- Attempt to connect to each opencode session
- Remove entries for dead sessions
- Re-populate in-memory Map with valid sessions

**4. Cleanup Job (`src/persistence/cleanup.ts`)**

- Run every hour
- Remove sessions inactive > 7 days
- Also check if opencode session still exists

---

## Implementation Steps

### Phase 1: Core Persistence

1. Create `src/persistence/store.ts` with load/save functions
2. Add `PERSISTENCE_FILE` constant to config
3. Modify `createOpencodeServer()` to accept optional `sessionId` parameter
4. Update `getOrCreateSession()` to check persistence layer

### Phase 2: Session Recovery

1. Create `src/persistence/recovery.ts` with recovery logic
2. Call recovery on bot startup (in `src/gateway/bot.ts`)
3. Add health check to verify opencode session exists

### Phase 3: Cleanup & Polish

1. Create `src/persistence/cleanup.ts` with scheduled cleanup
2. Update lastActivity timestamp on every message
3. Fix help text to accurately describe persistence behavior
4. Add `/session cleanup` command for manual cleanup

### Phase 4: Testing

1. Unit tests for store.ts (mock filesystem)
2. Integration tests for recovery
3. Test cleanup job
4. Verify behavior across bot restarts

---

## API Changes

### `createOpencodeServer()`

```ts
async function createOpencodeServer(options?: {
  port?: number
  timeout?: number
  sessionId?: string // NEW: attach to existing session
})
```

### `getOrCreateSession()`

Behavior change: checks persistence before creating new session.

---

## Open Questions

1. Should we persist the server port/URL or always use port 0 (ephemeral)?
2. How to handle Discord channel/thread deletion? (cleanup on failed send?)
3. Should sessions auto-expire even if active? (configurable TTL?)
4. Do we need to encrypt the persistence file? (contains session IDs)

---

## Risks

- **File corruption**: Use atomic writes, keep backup
- **Orphaned sessions**: Cleanup job should handle
- **Concurrent access**: Single process only, but file locking for safety
- **Large sessions file**: Paginate or use SQLite if >1000 sessions

---

## Future Enhancements

- SQLite backend for scale
- Session migration between channels
- Import/export session mappings
- Cross-device session sync
