package com.sports.service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.sports.dto.UserProfileUpdateRequest;
import com.sports.entity.*;
import com.sports.repository.*;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class UserProfileDateTest {
    final ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
    @Test void missingDateKeepsStoredDateAndExplicitNullClearsIt() throws Exception {
        var users = mock(UserRepository.class); var orders = mock(OrderRepository.class);
        var service = new UserService(users, mock(PasswordEncoder.class), orders);
        var user = User.builder().id(9L).role(Role.ROLE_USER).dob(LocalDate.of(2000, 3, 4)).build();
        when(users.findById(9L)).thenReturn(Optional.of(user));
        when(orders.findByUserIdOrderByCreatedAtDesc(9L)).thenReturn(List.of());
        when(orders.findRecognizedPaymentOrders()).thenReturn(List.of());
        service.updateUserProfile(9L, mapper.readValue("{\"fullName\":\"Tên mới\"}", UserProfileUpdateRequest.class));
        assertEquals(LocalDate.of(2000, 3, 4), service.getUserProfile(9L).getDob());
        service.updateUserProfile(9L, mapper.readValue("{\"dob\":\"1999-02-28\"}", UserProfileUpdateRequest.class));
        assertEquals(LocalDate.of(1999, 2, 28), service.getUserProfile(9L).getDob());
        service.updateUserProfile(9L, mapper.readValue("{\"dob\":null}", UserProfileUpdateRequest.class));
        assertNull(service.getUserProfile(9L).getDob());
    }
    @Test void futureAndOutOfDatabaseRangeDatesFailValidation() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            var future = new UserProfileUpdateRequest(); future.setDob(LocalDate.now().plusDays(1));
            assertFalse(validator.validate(future).isEmpty());
            var ancient = new UserProfileUpdateRequest(); ancient.setDob(LocalDate.of(999, 1, 1));
            assertFalse(validator.validate(ancient).isEmpty());
            var valid = mapper.readValue("{\"dob\":\"2000-02-29\"}", UserProfileUpdateRequest.class);
            assertTrue(validator.validate(valid).isEmpty());
        }
    }
}
