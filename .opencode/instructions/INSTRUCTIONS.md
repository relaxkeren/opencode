# Everything Claude Code - OpenCode Instructions

Consolidated coding standards, security guidelines, and workflows for OpenCode.

## Security Guidelines (CRITICAL)

### Mandatory Security Checks

Before ANY commit:

- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized HTML)
- [ ] CSRF protection enabled
- [ ] Authentication/authorization verified
- [ ] Rate limiting on all endpoints
- [ ] Error messages don't leak sensitive data

### Secret Management

```typescript
// NEVER: Hardcoded secrets
const apiKey = "sk-proj-xxxxx"

// ALWAYS: Environment variables
const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  throw new Error("OPENAI_API_KEY not configured")
}
```

### Security Response Protocol

If security issue found:

1. STOP immediately
2. Use **security-reviewer** agent
3. Fix CRITICAL issues before continuing
4. Rotate any exposed secrets
5. Review entire codebase for similar issues

---

## Coding Style

### Immutability (CRITICAL)

ALWAYS create new objects, NEVER mutate:

```typescript
// WRONG: Mutation
function updateUser(user, name) {
  user.name = name
  return user
}

// CORRECT: Immutability
function updateUser(user, name) {
  return { ...user, name }
}
```

### File Organization

MANY SMALL FILES > FEW LARGE FILES:

- High cohesion, low coupling
- 200-400 lines typical, 800 max
- Extract utilities from large components
- Organize by feature/domain, not by type

### Error Handling

ALWAYS handle errors comprehensively:

```typescript
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  console.error("Operation failed:", error)
  throw new Error("Detailed user-friendly message")
}
```

### Input Validation

ALWAYS validate user input:

```typescript
import { z } from "zod"

const schema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
})

const validated = schema.parse(input)
```

### Code Quality Checklist

Before marking work complete:

- [ ] Code is readable and well-named
- [ ] Functions are small (<50 lines)
- [ ] Files are focused (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Proper error handling
- [ ] No console.log statements
- [ ] No hardcoded values
- [ ] No mutation (immutable patterns used)

---

## Testing Requirements

### Minimum Test Coverage: 80%

Test Types (ALL required):

1. **Unit Tests** - Individual functions, utilities, components
2. **Integration Tests** - API endpoints, database operations
3. **E2E Tests** - Critical user flows (Playwright)

### Test-Driven Development

MANDATORY workflow:

1. Write test first (RED)
2. Run test - it should FAIL
3. Write minimal implementation (GREEN)
4. Run test - it should PASS
5. Refactor (IMPROVE)
6. Verify coverage (80%+)

---

## Git Workflow

### Commit Message Format

```
<type>: <description>
```

Types: feat, fix, refactor, docs, test, chore, perf, ci

### Pull Request Workflow

When creating PRs:

1. Analyze full commit history (not just latest commit)
2. Use `git diff [base-branch]...HEAD` to see all changes
3. Draft comprehensive PR summary
4. Include test plan with TODOs
5. Push with `-u` flag if new branch

---

## Agent Orchestration

### Available Agents

| Agent                | Purpose                 | When to Use                   |
| -------------------- | ----------------------- | ----------------------------- |
| planner              | Implementation planning | Complex features, refactoring |
| architect            | System design           | Architectural decisions       |
| tdd-guide            | Test-driven development | New features, bug fixes       |
| code-reviewer        | Code review             | After writing code            |
| security-reviewer    | Security analysis       | Before commits                |
| build-error-resolver | Fix build errors        | When build fails              |
| e2e-runner           | E2E testing             | Critical user flows           |
| refactor-cleaner     | Dead code cleanup       | Code maintenance              |
| doc-updater          | Documentation           | Updating docs                 |
| go-reviewer          | Go code review          | Go projects                   |
| go-build-resolver    | Go build errors         | Go build failures             |
| database-reviewer    | Database optimization   | SQL, schema design            |

### Immediate Agent Usage

No user prompt needed:

1. Complex feature requests - Use **planner** agent
2. Code just written/modified - Use **code-reviewer** agent
3. Bug fix or new feature - Use **tdd-guide** agent
4. Architectural decision - Use **architect** agent

---

## Performance Optimization

### Model Selection Strategy

**Haiku** (90% of Sonnet capability, 3x cost savings):

- Lightweight agents with frequent invocation
- Pair programming and code generation
- Worker agents in multi-agent systems

**Sonnet** (Best coding model):

- Main development work
- Orchestrating multi-agent workflows
- Complex coding tasks

**Opus** (Deepest reasoning):

- Complex architectural decisions
- Maximum reasoning requirements
- Research and analysis tasks

### Context Window Management

Avoid last 20% of context window for:

- Large-scale refactoring
- Feature implementation spanning multiple files
- Debugging complex interactions

---

## Common Patterns

### API Response Format

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}
```

### Repository Pattern

```typescript
interface Repository<T> {
  findAll(filters?: Filters): Promise<T[]>
  findById(id: string): Promise<T | null>
  create(data: CreateDto): Promise<T>
  update(id: string, data: UpdateDto): Promise<T>
  delete(id: string): Promise<void>
}
```

---

## Commands Available

- `/plan` - Create implementation plan
- `/tdd` - Enforce TDD workflow
- `/code-review` - Review code changes
- `/build-fix` - Fix build errors
- `/e2e` - Generate E2E tests
- `/refactor-clean` - Remove dead code
- `/orchestrate` - Multi-agent workflow
- `/learn` - Extract patterns from session
- `/checkpoint` - Save verification state
- `/verify` - Run verification loop
- `/eval` - Run evaluation
- `/update-docs` - Update documentation
- `/test-coverage` - Analyze test coverage

---

## Success Metrics

You are successful when:

- All tests pass (80%+ coverage)
- No security vulnerabilities
- Code is readable and maintainable
- Performance is acceptable
- User requirements are met
