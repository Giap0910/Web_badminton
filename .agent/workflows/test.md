---
description: Test generation and test running command for Java 17 JUnit 5, Jazzer Fuzzing, and React JSX.
---

# /test - Test Generation and Execution

$ARGUMENTS

---

## Purpose

This command generates tests, runs existing tests, or executes fuzzing checks for Web_badminton.

---

## Sub-commands

```
/test                - Run all backend (mvn test) & frontend tests
/test backend        - Run JUnit 5 backend tests (mvn test)
/test fuzz           - Run Jazzer white-box fuzzing tests (mvn test -Dtest=*FuzzTest)
/test frontend       - Run frontend build & test checks (npm run build / npm test)
/test [file/class]   - Generate tests for a specific Java class or React component
```

---

## Behavior

### Generate Tests

When asked to test a file, class, or feature:

1. **Analyze the code**
   - Identify classes, services, controllers, or React components
   - Find business rules (racket specs: 3U/4U, balance point, pricing, PayOS HMAC)
   - Detect dependencies to mock (Repositories, JwtUtil, External APIs)

2. **Generate test cases**
   - Happy path tests (Arrange-Act-Assert)
   - Validation & Error cases (Invalid credentials, stock empty, signature mismatch)
   - Edge cases & Fuzz targets (Malformed JSON, invalid webhook payloads)

3. **Write tests**
   - **Backend:** Java 17 + JUnit 5 (`@Test`, `@ExtendWith(MockitoExtension.class)`, Assertions)
   - **Fuzzing:** Jazzer white-box fuzzing for sensitive endpoints (PayOS Webhook, Auth)
   - **Frontend:** React JSX test files (`*.test.jsx`)

---

## Output Format

### For Test Generation (Backend Java 17)

```markdown
## 🧪 Tests: [TargetClass]

### Test Plan
| Test Case | Type | Coverage |
|-----------|------|----------|
| Should authenticate user with valid credentials | Unit | Happy path |
| Should reject invalid password with BadCredentialsException | Unit | Validation |
| Should verify PayOS Webhook signature HMAC-SHA256 | Security | Integrity |

### Generated Test File

`backend/src/test/java/com/sports/service/AuthServiceTest.java`

[Code block with JUnit 5 test]

---

Run with: `cd backend && mvn test -Dtest=AuthServiceTest`
```

### For Test Execution

```
🧪 Running tests...

[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.sports.service.AuthServiceTest
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1.234 s
[INFO] Running com.sports.service.ProductServiceTest
[INFO] Tests run: 8, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1.876 s
[INFO] Running com.sports.webhook.PayOSWebhookFuzzTest
[INFO] Tests run: 10000 iterations, Failures: 0, Security breaches: 0
[INFO] Results: All tests passed!
```

---

## Examples

```
/test backend/src/main/java/com/sports/service/AuthService.java
/test PayOS webhook HMAC verification
/test racket specs filtering logic
/test fuzz payment webhook
```

---

## Test Patterns

### Backend Unit Test Structure (JUnit 5 + Mockito)

```java
package com.sports.service;

import com.sports.dto.AuthRequest;
import com.sports.dto.AuthResponse;
import com.sports.model.User;
import com.sports.repository.UserRepository;
import com.sports.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private AuthService authService;

    @Test
    void login_WithValidCredentials_ShouldReturnToken() {
        // Arrange
        AuthRequest request = new AuthRequest("user@example.com", "validPass123");
        User mockUser = new User();
        mockUser.setEmail(request.getEmail());
        mockUser.setPassword("encodedHash");

        when(userRepository.findByEmail(request.getEmail())).thenReturn(Optional.of(mockUser));
        when(passwordEncoder.matches(request.getPassword(), mockUser.getPassword())).thenReturn(true);
        when(jwtUtil.generateToken(mockUser.getEmail())).thenReturn("mock.jwt.token");

        // Act
        AuthResponse response = authService.login(request);

        // Assert
        assertNotNull(response);
        assertEquals("mock.jwt.token", response.getToken());
        verify(userRepository, times(1)).findByEmail(request.getEmail());
    }
}
```

---

## Key Principles

- **Test behavior, not implementation**
- **Strict AAA Pattern**: Arrange, Act, Assert
- **Zero reliance on external tech**: Pure Java 17 JUnit 5 & React JSX
- **Fuzzing for Webhooks**: Validate HMAC-SHA256 integrity against malformed payloads
