---
name: context-compression
description: Manage and compress conversation context in long sessions. Detect when context is growing large, summarize completed work phases, archive old findings while preserving key decisions. Prevents context degradation.
when_to_use: "When a session has 20+ turns, when context feels repetitive, when the agent is losing track of earlier work, or when the user says 'summarize what we've done'. NOT for short sessions."
allowed-tools: Read, Write, Grep
effort: low
---

# Context Compression — Long Session Management

> Keep sessions productive by compressing completed work while preserving key decisions.

## Overview

Long sessions (30+ turns) cause context degradation — the AI loses track of earlier work, repeats itself, or forgets decisions. Context compression proactively summarizes completed phases so the context window stays focused on active work.

**Token Impact:** Recovers 5,000-15,000 tokens in long sessions by replacing verbose tool outputs with semantic summaries.

---

## When to Compress

| Signal | Action |
|---|---|
| Session has 20+ turns | Consider proactive compression |
| Agent repeats earlier suggestions | Context is saturated — compress now |
| User says "we already discussed this" | Compress immediately |
| Switching to a new phase of work | Compress the completed phase |
| Large tool output (500+ lines) | Micro-compact the output |

---

## Compression Levels

### Level 1: Micro-Compact (Tool Output)

Compress individual tool outputs while retaining semantic content:

```
❌ Before (raw grep output — 200 lines, ~4,000 tokens):
src/main/java/com/sports/badminton/security/JwtUtil.java:15: import io.jsonwebtoken.Jwts;
src/main/java/com/sports/badminton/security/JwtUtil.java:23: public boolean validateToken(String token) {
src/main/java/com/sports/badminton/security/JwtUtil.java:24:   try {
src/main/java/com/sports/badminton/security/JwtUtil.java:25:     Claims claims = Jwts.parserBuilder()...
... (195 more lines)

✅ After (micro-compact — 5 lines, ~100 tokens):
Grep results for "jwt": Found 6 files, 32 matches.
Key files: JwtUtil.java (main JWT logic), JwtFilter.java (Spring Security filter),
AuthController.java (login & token issuance). Token validation at JwtUtil.java:23-40.
Secret loaded from application.properties at JwtUtil.java:18.
```

### Level 2: Phase Summary

Replace a completed work phase with a summary:

```
❌ Before (full research transcript — ~3,000 tokens):
[turn 1] Read pom.xml...
[turn 2] Read WebBadmintonApplication.java...
[turn 3] Grep for "auth"...
[turn 4] Found 6 files related to auth...
[turn 5] Read JwtUtil.java...
... (10 more turns of exploration)

✅ After (phase summary — ~200 tokens):
## Research Phase Complete
- Project: Spring Boot 3.x backend with React 18 Vite frontend
- Auth files: JwtUtil.java, JwtFilter.java, SecurityConfig.java
- Token flow: POST /api/auth/login → generate JWT → client stores in LocalStorage → Bearer header
- Bug location: JwtUtil.java:45 — expiry validation logic uses `<` instead of `<=`
- Decision: Fix comparison check, add JUnit 5 test
```

### Level 3: Session Checkpoint

Full session summary for long-running work:

```markdown
## Session Checkpoint (Turn 35)

### Completed
- [x] Researched auth system (6 files, JWT flow mapped)
- [x] Fixed token expiry check in JwtUtil.java:45
- [x] Added edge case test in JwtUtilTest.java
- [x] Verified: `mvn test` passing

### In Progress
- [ ] Update API documentation
- [ ] Review SecurityConfig filter chain

### Key Decisions
1. Store JWT token in client LocalStorage with Axios interceptor
2. Use `<=` for expiry check to include exact-moment expiration
3. Add 5-minute grace period for clock skew

### Files Modified
- src/main/java/com/sports/badminton/security/JwtUtil.java (line 45)
- src/test/java/com/sports/badminton/security/JwtUtilTest.java (added 3 tests)
```

---

## Compression Protocol

### Step 1: Identify Completed Phases
```
What work is DONE and won't be revisited?
→ Research findings already synthesized
→ Implementation already verified
→ Decisions already made and applied
```

### Step 2: Extract Key Information
```
From the completed phase, preserve:
✅ Decisions made and WHY
✅ File paths and line numbers of changes
✅ Key findings that inform ongoing work
✅ Error messages or test results (summarized)

Discard:
❌ Step-by-step tool invocation details
❌ Full file contents that were read
❌ Exploratory dead-ends that didn't lead anywhere
❌ Verbose error stack traces (keep the message only)
```

### Step 3: Write Summary
```
Use the Phase Summary format above.
Keep to 100-300 tokens per completed phase.
Include enough detail to resume work without re-reading.
```

---

## Best Practices

1. **Compress phases, not facts** — Individual decisions should stay, full transcripts should go
2. **Preserve "why" over "what"** — Why a decision was made matters more than the exact commands run
3. **Never auto-compress** — Always tell the user "I'm summarizing the completed research phase to keep context focused"
4. **Keep file references** — Always preserve file paths and line numbers in summaries
5. **Checkpoint on phase transitions** — Natural compression point when switching from research to implementation
