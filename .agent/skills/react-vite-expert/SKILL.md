---
name: react-vite-expert
description: React 18+ JSX and Vite development best practices. Functional components, React Router DOM, Tailwind CSS, Lucide React, Axios client for Spring Boot REST API, and Context API state management.
when_to_use: "Always active when building or modifying frontend React components, pages, hooks, styling, or routing."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# React 18 + Vite Expert Standards

> **Philosophy:** Pure JSX. Fast HMR. Single responsibility. Smooth responsive UI. Pure JavaScript execution.

---

## ⚡ Core Frontend Standards for Web_badminton

- **Language:** JavaScript (ES6+ Pure JSX, `.jsx` extension).
- **Tooling:** Vite 6.x (development on `http://localhost:5173`, build via `npm run build`).
- **Styling:** Tailwind CSS utility-first, aligned with `design/home/DESIGN.md` tokens.
- **Icons:** `lucide-react` (clean, lightweight, accessible SVG icons).
- **Navigation:** React Router DOM v6 (`BrowserRouter`, `Routes`, `Route`, `Link`, `useNavigate`).
- **Data Fetching:** Axios instance with base URL pointing to Spring Boot backend (`http://localhost:8080/api`).
- **State Management:**
  - `AuthContext`: Authenticated user, JWT token storage, login/logout.
  - `CartContext`: Shopping cart items with LocalStorage persistence.
  - `CompareContext`: Selected badminton rackets (up to 3) for side-by-side spec comparison.
  - Local component state via `useState`, `useReducer`, `useMemo`, `useCallback`.

---

## 🧩 Component Architecture Rules

1. **Pure `.jsx` Files Only:** Always write standard JavaScript `.jsx` files without non-standard syntax or external typing overhead.
2. **Atomic Method Guideline:** Break large components down into sub-components or helper renderers (≤ 25 lines per method where practical).
3. **Graceful Degradation & Mock Fallback:** When the backend server is offline, components must fall back smoothly to local mock data without breaking the page layout.
4. **Accessible Semantics:** Proper HTML5 tags (`header`, `main`, `section`, `nav`, `footer`), keyboard navigation, and descriptive `aria-label`s.
5. **Clean Prop Destructuring:** Explicitly destructure component props with clear default values:
   ```jsx
   const ProductCard = ({ product = {}, onSelect = () => {} }) => {
     // implementation
   };
   ```

---

## 🎨 Design System Compliance

- **No Purple:** Adhere strictly to the Purple Ban. Use Deep Navy (`#0F172A`, `#131B2E`), Athletic Crimson (`#EF4444`), and Royal Sport Blue (`#2563EB`).
- **Fonts:** `Plus Jakarta Sans` for titles, prices, and emphasis; `Inter` for specs and body copy.
- **Responsive Breakpoints:**
  - Mobile: `< 640px` (single/two-column cards, collapsible navigation).
  - Tablet: `640px - 1024px` (two/three-column cards).
  - Desktop: `> 1024px` (four-column product grids, full navbar row).
