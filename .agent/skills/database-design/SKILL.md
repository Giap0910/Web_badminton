---
name: database-design
description: Database design principles for MySQL 8 (XAMPP Server, port 3306, utf8mb4) and Spring Data JPA. Schema modeling, relations, indexing, and query optimization for badminton e-commerce.
when_to_use: "When designing or modifying MySQL tables, JPA entities, indexes, or optimizing database queries."
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Database Design Standards (MySQL 8 + Spring Data JPA)

> **Philosophy:** Relational integrity. utf8mb4 encoding. Strategic indexing for e-commerce search. N+1 query elimination.

---

## 💾 Database Configuration (Ground Truth)

- **Database Engine:** MySQL 8.x
- **Environment:** XAMPP Server (Default port: `3306`)
- **Default Database:** `badminton_db`
- **Charset / Collation:** `utf8mb4` / `utf8mb4_unicode_ci` (Full Vietnamese text & unicode support)
- **ORM / Data Layer:** Spring Data JPA / Hibernate

---

## 🏸 Domain Entity Models & Relationships

| Entity | Table Name | Key Attributes | Relations |
|--------|------------|----------------|-----------|
| `User` | `users` | id, username, email, password, role (`ROLE_USER`, `ROLE_ADMIN`) | 1-N Orders, 1-N Reviews |
| `Product` | `products` | id, name, brand, category, price, original_price, stock, specs (weight_grip, balance_point, stiffness) | 1-N OrderItems, 1-N Reviews |
| `Order` | `orders` | id, user_id, total_amount, status, payment_method, shipping_address | N-1 User, 1-N OrderItems |
| `OrderItem` | `order_items` | id, order_id, product_id, quantity, unit_price | N-1 Order, N-1 Product |
| `AiChatLog`| `ai_chat_logs` | id, session_id, user_message, ai_response, created_at | Consultations history |

---

## ⚡ Indexing & Performance Rules

1. **Search & Filter Indexes:**
   - Index on `products(category, brand, price)` for instant product catalog filtering.
   - Full-text or index on `products(name)` for search keyword lookups.
2. **Foreign Key Indexes:**
   - Always ensure indexes on `orders(user_id)` and `order_items(order_id, product_id)`.
3. **Preventing N+1 Queries:**
   - Use `@EntityGraph(attributePaths = {"orderItems"})` or JPQL `JOIN FETCH` when retrieving orders with items.
