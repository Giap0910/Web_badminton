---
name: java-spring-patterns
description: Java 17 LTS and Spring Boot 3.x backend architecture, 3-tier structure (Controller, Service, Repository), Spring Data JPA, Spring Security JWT, PayOS Webhook HMAC, and JUnit 5 testing.
when_to_use: "Always active when developing or modifying backend Java code, Spring Boot controllers, services, repositories, JPA entities, security filters, or tests."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Java 17 & Spring Boot 3 Architecture Patterns

> **Philosophy:** Strict 3-Tier Layering. Explicit dependency injection. Strong data contracts. Secure by default.

---

## 🏗️ 3-Tier Layered Architecture (Mandatory)

All backend logic in Web_badminton MUST follow the 3-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CONTROLLER LAYER (com.sports.controller)                 │
│ • Handles HTTP requests, path variables, query params       │
│ • Validates inputs using @Valid / DTOs                       │
│ • Returns ResponseEntity<ApiResponse<T>>                    │
│ • NO business logic, NO direct repository calls             │
└───────────────────────────┬─────────────────────────────────┘
                            │ Calls Service
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. SERVICE LAYER (com.sports.service)                       │
│ • Encapsulates ALL business logic & transaction boundaries   │
│ • Performs racket spec validation (3U/4U, tension, flex)     │
│ • Calculates order totals, discounts, inventory deductions  │
│ • Verifies PayOS Webhook HMAC-SHA256 signatures              │
│ • Integrates with Gemini AI for badminton consultations      │
└───────────────────────────┬─────────────────────────────────┘
                            │ Calls Repository
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. REPOSITORY LAYER (com.sports.repository)                 │
│ • Extends JpaRepository<Entity, ID>                         │
│ • Custom queries using @Query (JPQL) or method naming        │
│ • Interacts directly with MySQL 8 (port 3306, utf8mb4)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔒 Security & Payment Verification

### 1. Spring Security & JWT Filter
- Stateless session policy: `SessionCreationPolicy.STATELESS`
- Password hashing: `BCryptPasswordEncoder`
- Role-based authorization: `ROLE_USER`, `ROLE_ADMIN`
- Token extraction and authentication via `JwtAuthenticationFilter`

### 2. PayOS Webhook HMAC-SHA256 Signature Verification
- PayOS webhooks MUST be verified using HMAC-SHA256 with the checksum key before processing order status.
- Never trust webhook payloads without signature validation.

---

## 🧪 Testing Patterns (JUnit 5 + Jazzer Fuzzing)

### 1. Unit Testing with JUnit 5 & Mockito
- Use `@ExtendWith(MockitoExtension.class)`
- Follow strict Arrange-Act-Assert (AAA) pattern.
- Mock all external dependencies (`UserRepository`, `PasswordEncoder`, etc.).

### 2. White-box Fuzzing with Jazzer
- Used for high-risk endpoints (PayOS Webhook parsing, Auth deserialization).
- Run fuzz tests with: `mvn test -Dtest=*FuzzTest`

---

## 💻 Java 17 Clean Code Practices

- Use `record` for immutable DTOs (e.g., `record AuthRequest(String email, String password) {}`).
- Use pattern matching for `instanceof`.
- Use text blocks `"""` for multi-line JPQL or SQL queries.
- Keep methods atomic: ≤ 25 lines of clean, self-documenting code.
- Avoid raw types or unhandled `null` — prefer `Optional<T>`.
