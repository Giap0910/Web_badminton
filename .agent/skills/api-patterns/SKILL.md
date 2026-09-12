---
name: api-patterns
description: RESTful API design principles and standards for Spring Boot 3.x backend. Resource naming, HTTP methods, DTO contracts, JWT auth, PayOS Webhook HMAC, and pagination.
when_to_use: "When designing or modifying Spring Boot REST API endpoints, DTO response formats, pagination, or API security."
allowed-tools: Read, Write, Edit, Glob, Grep
---

# RESTful API Patterns for Web_badminton

> **Philosophy:** Strict REST conventions. Meaningful HTTP status codes. Clear DTO contracts. Standardized ApiResponse envelopes.

---

## 🎯 Core Endpoints Structure (`/api/...`)

All backend APIs are served from Spring Boot on port 8080:

| Resource | Method | Path | Description |
|----------|--------|------|-------------|
| **Auth** | POST | `/api/auth/register` | User registration |
| | POST | `/api/auth/login` | JWT login token |
| **Products** | GET | `/api/products` | Filtered product list (category, brand, keyword) |
| | GET | `/api/products/{id}` | Product detail with racket specs |
| | POST | `/api/products` | Create product (ROLE_ADMIN) |
| **Orders** | POST | `/api/orders` | Checkout order creation |
| | GET | `/api/orders/{id}` | Order details |
| | GET | `/api/orders/my-orders` | Authenticated user's order history |
| **Payments** | POST | `/api/payment/create` | PayOS payment link generation |
| | POST | `/api/payment/webhook`| PayOS Webhook (HMAC-SHA256 validated) |
| **AI Advisor**| POST | `/api/ai/chat` | Gemini AI badminton racket consultant |

---

## 📦 Standard API Response Envelope

Every endpoint returns a predictable JSON envelope:

```java
public record ApiResponse<T>(
    boolean success,
    String message,
    T data,
    long timestamp
) {
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, "Success", data, System.currentTimeMillis());
    }
    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null, System.currentTimeMillis());
    }
}
```

---

## ✅ Best Practices Checklist

- [ ] Use nouns for endpoints (`/api/products`, not `/api/getProducts`).
- [ ] Use proper HTTP methods: `GET` (read), `POST` (create), `PUT` (update), `DELETE` (delete).
- [ ] Return standard HTTP status codes: `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.
- [ ] DTOs must encapsulate data, never expose entity models directly to frontend.
- [ ] PayOS Webhook requests must verify HMAC-SHA256 signature before processing.
