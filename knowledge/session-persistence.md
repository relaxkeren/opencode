# OpenCode Session Persistence

How OpenCode persists session data across process restarts and enables multiple clients to access the same sessions.

---

## Overview

OpenCode uses **SQLite** as the primary storage mechanism for session persistence. Sessions, messages, and message parts are stored in a local database file that survives process restarts, system reboots, and can be accessed by multiple OpenCode processes simultaneously.

---

## Database Location

```
~/.config/opencode/opencode.db  # Linux/macOS
%APPDATA%/opencode/opencode.db  # Windows
```

The path is determined by `Global.Path.data` in the runtime configuration.

---

## Database Configuration

OpenCode configures SQLite for reliability and concurrent access:

```sql
PRAGMA journal_mode = WAL;       -- Write-Ahead Logging for concurrent reads/writes
PRAGMA synchronous = NORMAL;     -- Balance between safety and performance
PRAGMA busy_timeout = 5000;      -- Wait up to 5 seconds if database is locked
PRAGMA cache_size = -64000;      -- 64MB cache (negative = KB units)
PRAGMA foreign_keys = ON;        -- Enforce referential integrity
PRAGMA wal_checkpoint(PASSIVE);  -- Allow WAL cleanup without blocking
```

### Why WAL Mode?

**Write-Ahead Logging (WAL)** enables:
- **Concurrent readers**: Multiple processes can read while one writes
- **Better performance**: Writers don't block readers
- **Crash safety**: Committed transactions survive crashes
- **Cross-process access**: Discord bot and TUI can access same database

---

## Database Schema

### Session Table

Stores session metadata and configuration.

```typescript
// packages/opencode/src/session/session.sql.ts
export const SessionTable = sqliteTable("session", {
  id: text().primaryKey(),                    // Unique session ID (e.g., "ses_xxx")
  project_id: text().notNull(),               // Foreign key to project
  parent_id: text(),                          // For forked sessions (self-reference)
  slug: text().notNull(),                     // URL-friendly identifier
  directory: text().notNull(),                // Working directory path
  title: text().notNull(),                    // User-facing session name
  version: text().notNull(),                  // Session format version
  share_url: text(),                          // Public share URL (if shared)
  summary_additions: integer(),               // Stats for UI display
  summary_deletions: integer(),
  summary_files: integer(),
  summary_diffs: text({ mode: "json" }),      // Array of file changes
  revert: text({ mode: "json" }),             // Revert state for undo/redo
  permission: text({ mode: "json" }),         // Permission ruleset
  time_created: integer().notNull(),          // Unix timestamp (ms)
  time_updated: integer().notNull(),
  time_compacting: integer(),                 // Last compaction timestamp
  time_archived: integer(),                   // Archive timestamp (soft delete)
})
```

### Message Table

Stores conversation messages within sessions.

```typescript
export const MessageTable = sqliteTable("message", {
  id: text().primaryKey(),                    // Unique message ID
  session_id: text().notNull(),               // Foreign key to session
  time_created: integer().notNull(),
  time_updated: integer().notNull(),
  data: text({ mode: "json" }).notNull(),     // Message content (MessageV2.Info)
})
```

### Part Table

Stores individual message parts (text, tool calls, file references).

```typescript
export const PartTable = sqliteTable("part", {
  id: text().primaryKey(),                    // Unique part ID
  message_id: text().notNull(),               // Foreign key to message
  session_id: text().notNull(),               // Denormalized for query efficiency
  time_created: integer().notNull(),
  time_updated: integer().notNull(),
  data: text({ mode: "json" }).notNull(),     // Part content (MessageV2.Part)
})
```

### Todo Table

Stores session-specific todos.

```typescript
export const TodoTable = sqliteTable("todo", {
  session_id: text().notNull(),
  content: text().notNull(),
  status: text().notNull(),                   // "pending", "completed", etc.
  priority: text().notNull(),
  position: integer().notNull(),              // For ordering
  time_created: integer().notNull(),
  time_updated: integer().notNull(),
})
```

---

## Session Lifecycle

### Creating a Session

```typescript
// packages/opencode/src/session/index.ts
export async function create(body?: { title?: string; directory?: string }) {
  const id = Identifier.generate("session")     // "ses_" + random
  const slug = await Slug.generate(title)       // URL-friendly
  const directory = body?.directory ?? cwd
  
  const row = {
    id,
    project_id: project.id,
    parent_id: null,
    slug,
    directory,
    title: body?.title ?? createDefaultTitle(),
    version: "1.0",
    time_created: Date.now(),
    time_updated: Date.now(),
  }
  
  await db.insert(SessionTable).values(row)
  return fromRow(row)
}
```

### Retrieving a Session

```typescript
export async function get(sessionID: string): Promise<Info> {
  const row = await db
    .select()
    .from(SessionTable)
    .where(eq(SessionTable.id, sessionID))
    .get()
    
  if (!row) throw new NotFoundError({ message: `Session not found: ${sessionID}` })
  return fromRow(row)
}
```

### Listing Sessions

```typescript
export async function* list(options?: {
  directory?: string    // Filter by project directory
  roots?: boolean       // Only root sessions (no parent)
  start?: number        // Sessions updated after timestamp
  search?: string       // Title search (case-insensitive)
  limit?: number        // Max results
}) {
  // Returns async generator of sessions
  // Sorted by time_updated DESC (most recent first)
}
```

### Updating a Session

```typescript
export async function setTitle({ sessionID, title }: { sessionID: string; title: string }) {
  await db
    .update(SessionTable)
    .set({ title, time_updated: Date.now() })
    .where(eq(SessionTable.id, sessionID))
}
```

### Archiving (Soft Delete)

```typescript
export async function setArchived({ sessionID, time }: { sessionID: string; time: number }) {
  await db
    .update(SessionTable)
    .set({ time_archived: time, time_updated: Date.now() })
    .where(eq(SessionTable.id, sessionID))
}
```

---

## Message Flow

### Storing a Message

```typescript
// packages/opencode/src/session/message-v2.ts
export async function create(body: {
  sessionID: string
  role: "user" | "assistant"
  parts: Array<Part>
}) {
  const messageId = Identifier.generate("message")
  
  // Insert message
  await db.insert(MessageTable).values({
    id: messageId,
    session_id: body.sessionID,
    time_created: Date.now(),
    time_updated: Date.now(),
    data: { role: body.role },
  })
  
  // Insert parts
  for (const part of body.parts) {
    const partId = Identifier.generate("part")
    await db.insert(PartTable).values({
      id: partId,
      message_id: messageId,
      session_id: body.sessionID,
      time_created: Date.now(),
      time_updated: Date.now(),
      data: part,
    })
  }
}
```

### Retrieving Messages

```typescript
export async function list(sessionID: string): Promise<WithParts[]> {
  // Join messages with their parts
  const rows = await db
    .select()
    .from(MessageTable)
    .where(eq(MessageTable.session_id, sessionID))
    .orderBy(asc(MessageTable.time_created))
    .all()
    
  for (const row of rows) {
    const parts = await db
      .select()
      .from(PartTable)
      .where(eq(PartTable.message_id, row.id))
      .all()
    
    yield { info: row.data, parts: parts.map(p => p.data) }
  }
}
```

---

## Cross-Process Access

### Multiple Clients, One Database

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Discord Bot   │     │  OpenCode TUI   │     │   Web Server    │
│  (your machine) │     │  (your machine) │     │  (your machine) │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  HTTP API             │  TUI Interface        │  Browser
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │   OpenCode Server         │
                    │   (SQLite + WAL mode)     │
                    │                           │
                    │   ~/.config/opencode/     │
                    │       opencode.db         │
                    └───────────────────────────┘
```

### How It Works

1. **Discord Bot** creates a session → Writes to SQLite
2. **TUI** lists sessions → Reads from SQLite (via WAL, no blocking)
3. **TUI** attaches to Discord session → Both see same messages
4. **Discord Bot** restarts → Sessions still in SQLite, can re-attach

### Code Example: Listing All Sessions

```typescript
// From any OpenCode process (Discord, TUI, etc.)
const client = createOpencodeClient({ baseUrl: "http://localhost:PORT" })

const result = await client.session.list({
  roots: true,        // Only top-level sessions
  limit: 50,          // Pagination
  search: "my project" // Filter by title
})

for (const session of result.data) {
  console.log(`${session.id}: ${session.title}`)
  console.log(`  Directory: ${session.directory}`)
  console.log(`  Updated: ${new Date(session.time.updated)}`)
}
```

---

## Session Recovery

### After Process Restart

When OpenCode restarts:

1. **Sessions exist in SQLite** → Not lost
2. **In-memory state is lost** → Need to re-query
3. **Client reconnects** → Spawns new server, attaches to session ID

**Windows Service Deployment:**
For production Discord bot deployments, install as a Windows Service to ensure automatic startup and restart on failure. See `packages/discord/persistence.md` for service installation instructions.

```typescript
// Reconnect to existing session
const session = await client.session.get({ sessionID: "ses_xxx" })

// Or create new one
const newSession = await client.session.create({
  title: "New conversation",
  directory: "/path/to/project"
})
```

### Forking Sessions

Sessions can be forked at any message point:

```typescript
const forked = await client.session.fork({
  sessionID: "ses_parent",
  messageID: "msg_xxx"  // Fork from this message
})
// Returns new session with history up to messageID
```

---

## Performance Considerations

### Indexing

The database includes indexes for common queries:

```typescript
// Session table indexes
index("session_project_idx").on(table.project_id)
index("session_parent_idx").on(table.parent_id)

// Message table indexes  
index("message_session_idx").on(table.session_id)

// Part table indexes
index("part_message_idx").on(table.message_id)
index("part_session_idx").on(table.session_id)

// Todo table indexes
index("todo_session_idx").on(table.session_id)
```

### Compaction (Summarization)

Long sessions can be compacted to reduce token usage:

```typescript
await client.session.summarize({ sessionID: "ses_xxx" })
```

This:
1. Uses AI to summarize conversation history
2. Replaces old messages with summary
3. Updates `time_compacting` timestamp
4. Preserves recent context window

---

## Migration

OpenCode automatically migrates the database schema on startup:

```typescript
// packages/opencode/src/storage/db.ts
export const Client = lazy(() => {
  const sqlite = new BunDatabase(path, { create: true })
  const db = drizzle({ client: sqlite, schema })
  
  // Apply migrations
  migrate(db, entries)  // entries from migration/ folder
  
  return db
})
```

Migrations are stored in:
```
packages/opencode/src/migration/YYYYMMDDHHMMSS/migration.sql
```

---

## Backup and Export

### Manual Backup

```bash
# Copy database file while opencode is running (WAL mode allows this)
cp ~/.config/opencode/opencode.db ~/backup/opencode-$(date +%Y%m%d).db
cp ~/.config/opencode/opencode.db-wal ~/backup/opencode-$(date +%Y%m%d).db-wal
```

### Export Session

```typescript
const messages = await client.session.messages({ sessionID: "ses_xxx" })
// Format as Markdown, JSON, etc.
```

---

## Troubleshooting

### Database Locked Errors

If you see "database is locked":

1. **Check for multiple processes**: `lsof ~/.config/opencode/opencode.db`
2. **Wait and retry**: WAL mode should handle this automatically
3. **Force checkpoint**: `PRAGMA wal_checkpoint(TRUNCATE)`

### Corruption Recovery

If database is corrupted:

1. **Stop all OpenCode processes**
2. **Delete WAL files**: `rm opencode.db-wal opencode.db-shm`
3. **Restore from backup** or delete database to start fresh

### Session Not Found

If session exists in UI but `session.get()` fails:

1. **Check session ID**: May have been archived (`time_archived` set)
2. **Query directly**: Use `session.list({ search: "title" })` to find
3. **Check database file**: May be different path than expected

---

## Related Files

- `packages/opencode/src/session/session.sql.ts` - Schema definitions
- `packages/opencode/src/session/index.ts` - Session CRUD operations
- `packages/opencode/src/session/message-v2.ts` - Message operations
- `packages/opencode/src/storage/db.ts` - Database connection
- `packages/opencode/src/storage/storage.ts` - Migration logic
- `packages/opencode/src/migration/` - Schema migrations

---

## Summary

OpenCode's session persistence is:

- **Reliable**: SQLite with WAL mode for crash safety
- **Concurrent**: Multiple processes can read/write simultaneously  
- **Portable**: Single file database, easy to backup/transfer
- **Queryable**: Full SQL query capabilities via Drizzle ORM
- **Versioned**: Automatic schema migrations on startup
