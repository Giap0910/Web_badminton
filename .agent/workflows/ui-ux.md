---
description: Plan and implement UI for HG Badminton using React 18 JSX, Vite, and Tailwind CSS.
---

# /ui-ux - Badminton E-Commerce UI/UX Design & Implementation

$ARGUMENTS

---

## Purpose

Plan, design, and implement responsive, high-performance UI components for Web_badminton based on the **High-Contrast Modern Athletic** design system (`design/home/DESIGN.md`).

---

## Tech Stack Standards (Strict)

- **Framework:** React 18+ Functional Components (`.jsx` pure, Vite build, port 5173).
- **Styling:** Tailwind CSS utility-first matching design tokens (8px grid system).
- **Typography:** `Plus Jakarta Sans` (headlines, prices, metric badges) + `Inter` (body, racket specs).
- **Icons:** `lucide-react` (high performance, lightweight vector icons).
- **API Integration:** Axios client calling Spring Boot backend at `http://localhost:8080/api`.
- **Purple Ban:** ❌ Strictly NO violet/purple as primary brand color.

---

## Design System Tokens Reference

### Colors
- **Primary Anchor:** `#0F172A` / `#131B2E` (Deep Slate Navy - header, navbar, footer, primary titles).
- **Secondary Action:** `#EF4444` / `#DC2626` (Athletic Crimson - "Add to Bag", sale badges, active CTAs).
- **Sport Accent:** `#2563EB` (Royal Sport Blue - racket comparison, specs tags, focus rings).
- **Canvas:** `#F8FAFC` (Slate Canvas), `#FFFFFF` (Product card containers), `#E2E8F0` (Borders).

### Geometry & Radii
- **Inputs & Badges:** `0.25rem` (4px) to `0.375rem` (6px) — sharp, high-precision technical feel.
- **Product Cards & Panels:** `0.75rem` (12px) to `1rem` (16px) with crisp 1px borders.
- **Sale Pills:** `rounded-full` (9999px) reserved exclusively for percentage badges (`-20%`) and status pills.

---

## Workflow Steps

### Step 1: Requirements & Specs Mapping
Extract domain-specific requirements:
- Product types: Rackets (Vợt), Shoes (Giày), Bags (Balo/Bao vợt), Accessories (Phụ kiện), Apparel (Quần áo).
- Technical specs: Weight/Grip (`3U/G5`, `4U/G5`), Balance point (Head-Heavy, Even, Head-Light), Tension (`20-35 lbs`).

### Step 2: Component Architecture
Create reusable, focused `.jsx` components adhering to the ≤ 25 lines atomic method guideline:
- Co-locate component styles using Tailwind utility classes.
- Support loading skeletons, empty states, and fallback images.

### Step 3: Motion & Physical Feedback
- Hover states: `hover:-translate-y-1 hover:shadow-lg transition-all duration-300`.
- Active buttons: `active:scale-95`.
- Interactive feedback for favorites, comparison drawer, and cart additions.

### Step 4: Verification
- Verify responsive layouts: Mobile (375px), Tablet (768px), Desktop (1280px container max).
- Run build check:
  ```powershell
  cd frontend
  npm run build
  ```