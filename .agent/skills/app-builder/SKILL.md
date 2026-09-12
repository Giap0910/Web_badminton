---
name: app-builder
description: Application building orchestrator for Web_badminton. Scaffolds components, Spring Boot backend endpoints, JPA entities, and coordinates agents.
when_to_use: "When building new features, scaffolding React JSX components, or adding Spring Boot 3-tier modules."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent
---

# App Builder - Badminton E-Commerce Architecture

> **Philosophy:** Strict adherence to project Ground Truth. Java 17 Spring Boot backend + React 18 JSX Vite frontend + MySQL 8.

---

## 🎯 Architecture Standards

| Tier | Technology | Guidelines |
|------|------------|------------|
| **Frontend** | React 18+ JSX, Vite, Tailwind CSS, Lucide React | Pure `.jsx` files, port 5173, calls API on port 8080 |
| **Backend** | Java 17 LTS, Spring Boot 3.x, Maven | 3-tier: Controller -> Service -> Repository |
| **Database** | MySQL 8 (port 3306, utf8mb4) | Spring Data JPA entities, relational mapping |
| **Security & Payment** | Spring Security JWT, PayOS Webhook HMAC-SHA256 | Strict token authentication & signature verification |
| **Testing** | JUnit 5 + Mockito + Jazzer Fuzzing | AAA pattern, fuzz testing on webhook endpoints |

---

## 🔗 Agent Coordination Pipeline

1. **`database-architect`**: Creates or updates JPA Entity and repository interface in `com.sports.model` & `com.sports.repository`.
2. **`backend-specialist`**: Implements business service logic in `com.sports.service` and REST API in `com.sports.controller`.
3. **`frontend-specialist`**: Builds user interface in `frontend/src/pages/` and `frontend/src/components/` using pure `.jsx` and Tailwind CSS.
4. **`test-engineer`**: Writes JUnit 5 tests in `backend/src/test/java/` and runs verification.
