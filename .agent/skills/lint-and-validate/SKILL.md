---
name: lint-and-validate
description: Automatic quality control, linting, and build validation for Web_badminton. Uses Maven for Java 17 backend and ESLint / Vite build for React 18 JSX frontend.
when_to_use: "After modifying Java backend code or React JSX frontend code to ensure compilation and linting correctness."
allowed-tools: Read, Glob, Grep, Bash
---

# Lint & Validation Standards for Web_badminton

> **MANDATORY:** Run appropriate validation tools after code changes. Do not finish a task until both backend and frontend pass validation.

---

## 🚀 Procedures by Layer

### 1. Frontend (React 18 JSX + Vite)
Located in `frontend/`:
1. **Linting:** `cd frontend && npm run lint`
2. **Build Validation:** `cd frontend && npm run build` (Ensures zero JSX syntax errors, import resolution issues, or CSS bundle errors)

### 2. Backend (Java 17 LTS + Spring Boot 3.x)
Located in `backend/`:
1. **Compilation Check:** `cd backend && mvn test-compile`
2. **Unit & Integration Test:** `cd backend && mvn test`
3. **Dependency & Security:** `cd backend && mvn dependency:analyze`

---

## 🔄 The Quality Loop

1. **Write / Edit Code:** Follow atomic method guideline (≤ 25 lines per method).
2. **Run Validation:**
   - For frontend changes: `cd frontend && npm run build`
   - For backend changes: `cd backend && mvn test-compile`
3. **Fix & Repeat:** Never submit code with compilation or build failures.
