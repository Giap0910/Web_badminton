package com.sports.service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.sports.dto.UserProfileUpdateRequest;
import com.sports.dto.ChangePasswordRequest;
import com.sports.dto.ShippingAddressDto;
import com.sports.exception.BadRequestException;
import com.sports.exception.ResourceNotFoundException;
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
        when(users.findByIdForUpdate(9L)).thenReturn(Optional.of(user));
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

    private UserFixture userFixture() {
        var users=mock(UserRepository.class);var orders=mock(OrderRepository.class);var encoder=mock(PasswordEncoder.class);
        var user=User.builder().id(9L).username("profile").fullName("Tên kiểm thử").password("old-hash").role(Role.ROLE_USER).build();
        when(users.findById(9L)).thenReturn(Optional.of(user));when(users.findByIdForUpdate(9L)).thenReturn(Optional.of(user));
        when(users.save(any())).thenAnswer(call->call.getArgument(0));when(users.saveAndFlush(any())).thenAnswer(call->call.getArgument(0));
        when(orders.findByUserIdOrderByCreatedAtDesc(9L)).thenReturn(List.of());when(orders.findRecognizedPaymentOrders()).thenReturn(List.of());
        return new UserFixture(users,encoder,user,new UserService(users,encoder,orders));
    }

    private record UserFixture(UserRepository users,PasswordEncoder encoder,User user,UserService service) {}

    @Test void genderRoundTripOmissionAndExplicitNullMatchDateSemantics() throws Exception {
        var fixture=userFixture();
        fixture.service().updateUserProfile(9L,mapper.readValue("{\"gender\":\"nu\"}",UserProfileUpdateRequest.class));
        assertEquals("nu",fixture.service().getUserProfile(9L).getGender());
        fixture.service().updateUserProfile(9L,mapper.readValue("{\"fullName\":\"Tên mới\"}",UserProfileUpdateRequest.class));
        assertEquals("nu",fixture.user().getGender());
        fixture.service().updateUserProfile(9L,mapper.readValue("{\"gender\":null}",UserProfileUpdateRequest.class));
        assertNull(fixture.user().getGender());verify(fixture.users(),times(3)).findByIdForUpdate(9L);
        var invalid=mapper.readValue("{\"gender\":\"unknown\"}",UserProfileUpdateRequest.class);
        assertThrows(BadRequestException.class,()->fixture.service().updateUserProfile(9L,invalid));
        assertFalse(mapper.writeValueAsString(invalid).contains("genderProvided"));
    }

    @Test void passwordChangeRevokeAndProfileAvatarCannotRestoreAnOlderVersion() throws Exception {
        var fixture=userFixture();var request=new ChangePasswordRequest("old-secret","new-secret");
        when(fixture.encoder().matches("old-secret","old-hash")).thenReturn(true);
        when(fixture.encoder().encode("new-secret")).thenReturn("new-hash");
        fixture.service().changePassword(9L,request);
        assertEquals("new-hash",fixture.user().getPassword());assertEquals(1L,fixture.user().getTokenVersion());
        fixture.service().updateUserProfile(9L,mapper.readValue("{\"gender\":\"nam\"}",UserProfileUpdateRequest.class));
        var avatar=mock(AvatarStorageService.class);org.springframework.test.util.ReflectionTestUtils.setField(fixture.service(),"avatarStorage",avatar);
        var file=new org.springframework.mock.web.MockMultipartFile("file","image.png","image/png",new byte[]{1});
        when(avatar.store(file)).thenReturn("new-avatar.png");fixture.service().uploadAvatar(9L,file);fixture.service().deleteAvatar(9L);
        assertEquals(1L,fixture.user().getTokenVersion());assertEquals("new-hash",fixture.user().getPassword());
        verify(fixture.users(),times(4)).findByIdForUpdate(9L);
    }

    @Test void newPasswordsAreBoundedByUtf8BytesAndWrongCurrentPasswordDoesNotRevoke() {
        assertDoesNotThrow(()->AuthService.validateNewPassword("a".repeat(72)));
        assertDoesNotThrow(()->AuthService.validateNewPassword("đ".repeat(36)));
        assertThrows(BadRequestException.class,()->AuthService.validateNewPassword("đ".repeat(37)));
        assertThrows(BadRequestException.class,()->AuthService.validateNewPassword("😀".repeat(19)));
        var fixture=userFixture();
        assertThrows(BadRequestException.class,()->fixture.service().changePassword(9L,new ChangePasswordRequest("wrong","new-secret")));
        assertEquals(0L,fixture.user().getTokenVersion());assertEquals("old-hash",fixture.user().getPassword());
        assertThrows(BadRequestException.class,()->fixture.service().changePassword(9L,
                new ChangePasswordRequest("old-secret","đ".repeat(37))));
        verify(fixture.encoder(),never()).encode(any());
    }

    @Test void lockUnlockRevokeSessionsAndLastActiveAdministratorCannotBeLocked() {
        var fixture=userFixture();
        fixture.service().updateUserStatus(9L,false);assertEquals(1L,fixture.user().getTokenVersion());
        fixture.service().updateUserStatus(9L,false);assertEquals(1L,fixture.user().getTokenVersion());
        fixture.service().updateUserStatus(9L,true);assertEquals(2L,fixture.user().getTokenVersion());
        fixture.user().setRole(Role.ROLE_ADMIN);
        when(fixture.users().findAllAdminsForUpdate()).thenReturn(List.of(fixture.user()));
        assertThrows(BadRequestException.class,()->fixture.service().updateUserStatus(9L,false));
        assertTrue(fixture.user().getIsActive());assertEquals(2L,fixture.user().getTokenVersion());
        var other=User.builder().id(10L).role(Role.ROLE_ADMIN).build();
        when(fixture.users().findAllAdminsForUpdate()).thenReturn(List.of(fixture.user(),other));
        assertFalse(fixture.service().updateUserStatus(9L,false).getIsActive());
        assertEquals(3L,fixture.user().getTokenVersion());
    }

    @Test void registrationRejectsBcryptByteOverflowBeforeEncodingOrPersisting() {
        var users=mock(UserRepository.class);var encoder=mock(PasswordEncoder.class);
        var service=new AuthService(mock(org.springframework.security.authentication.AuthenticationManager.class),users,encoder,
                mock(com.sports.security.JwtTokenProvider.class));
        var request=new com.sports.dto.RegisterRequest();request.setPassword("đ".repeat(37));
        assertThrows(BadRequestException.class,()->service.register(request));verifyNoInteractions(users,encoder);
    }

    private ShippingAddressDto addressBody() {
        return ShippingAddressDto.builder().fullName("Khách giao hàng").phone("0900000000")
                .address("Số 10 đường kiểm thử").province("Hà Nội").isDefault(false).build();
    }

    @Test void shippingMetadataPersistsClearsAndDuplicateCreateUsesExistingAddress() throws Exception {
        var users=mock(UserRepository.class);var addresses=mock(ShippingAddressRepository.class);
        var service=new ShippingAddressService(addresses,users);var user=User.builder().id(9L).build();
        when(users.findByIdForUpdate(9L)).thenReturn(Optional.of(user));var saved=new ArrayList<ShippingAddress>();
        when(addresses.findByUserIdOrderByIsDefaultDescCreatedAtDesc(9L)).thenAnswer(call->saved);
        when(addresses.findByIdAndUserId(1L,9L)).thenAnswer(call->saved.stream().findFirst());
        when(addresses.saveAndFlush(any())).thenAnswer(call->{ShippingAddress value=call.getArgument(0);
            if (value.getId()==null) { value.setId(1L);saved.add(value); }return value;});
        var body=addressBody();body.setNote("Gọi trước khi giao");body.setTag("Văn phòng");
        var first=service.createAddress(9L,body);assertTrue(first.getIsDefault());assertEquals("Văn phòng",first.getTag());
        assertEquals(first.getId(),service.createAddress(9L,addressBody()).getId());assertEquals(1,saved.size());
        service.updateAddress(1L,9L,addressBody());assertEquals("Gọi trước khi giao",saved.get(0).getNote());
        var cleared=mapper.readValue(mapper.writeValueAsString(addressBody()),
                ShippingAddressDto.class);
        cleared.setNote(null);cleared.setTag(null);service.updateAddress(1L,9L,cleared);
        assertNull(saved.get(0).getNote());assertNull(saved.get(0).getTag());
        service.setDefaultAddress(1L,9L);service.setDefaultAddress(1L,9L);assertTrue(saved.get(0).getIsDefault());
        verify(users,times(6)).findByIdForUpdate(9L);
        assertFalse(mapper.writeValueAsString(cleared).contains("noteProvided"));
    }

    @Test void shippingRejectsForeignAddressInvalidTagPhoneAndLongNote() {
        var users=mock(UserRepository.class);var addresses=mock(ShippingAddressRepository.class);
        var service=new ShippingAddressService(addresses,users);when(users.findByIdForUpdate(9L)).thenReturn(Optional.of(User.builder().id(9L).build()));
        assertThrows(ResourceNotFoundException.class,()->service.updateAddress(99L,9L,addressBody()));
        var body=addressBody();body.setPhone("0|12345678");
        assertThrows(BadRequestException.class,()->service.createAddress(9L,body));
        body.setPhone("0900000000");body.setTag("Không hợp lệ");
        assertThrows(BadRequestException.class,()->service.createAddress(9L,body));
        body.setTag(null);body.setNote("x".repeat(1001));
        assertThrows(BadRequestException.class,()->service.createAddress(9L,body));verify(addresses,never()).saveAndFlush(any());
    }

    @org.junit.jupiter.api.Nested
    @org.junit.jupiter.api.TestInstance(org.junit.jupiter.api.TestInstance.Lifecycle.PER_CLASS)
    @org.junit.jupiter.api.condition.EnabledIfSystemProperty(named="account.workflow.mysql",matches="true")
    class MysqlAccounts {
        private org.springframework.context.annotation.AnnotationConfigApplicationContext context;
        private org.springframework.transaction.support.TransactionTemplate tx;
        private UserService profiles;
        private ShippingAddressService shipping;

        @org.junit.jupiter.api.BeforeAll void openMysql() {
            context=new org.springframework.context.annotation.AnnotationConfigApplicationContext(AccountConfig.class);
            tx=new org.springframework.transaction.support.TransactionTemplate(context.getBean(org.springframework.transaction.PlatformTransactionManager.class));
            profiles=context.getBean(UserService.class);shipping=context.getBean(ShippingAddressService.class);
        }

        @org.junit.jupiter.api.AfterAll void closeMysql() { if (context!=null) context.close(); }

        private Long account(Role role) {
            return tx.execute(status->{
                String key=UUID.randomUUID().toString().replace("-","");
                return context.getBean(UserRepository.class).saveAndFlush(User.builder().username("acct"+key)
                        .email(key+"@example.invalid").fullName("Tài khoản kiểm thử").role(role)
                        .password(context.getBean(PasswordEncoder.class).encode("old-secret")).build()).getId();
            });
        }

        @Test void passwordAndProfileRaceRetainPasswordRevokeAndPersonalFields() throws Exception {
            Long id=account(Role.ROLE_USER);
            var gender=new UserProfileUpdateRequest();gender.setGender("nu");gender.setDob(LocalDate.of(2000,3,4));
            var responses=race(()->{profiles.changePassword(id,new ChangePasswordRequest("old-secret","new-secret"));return "password";},
                    ()->profiles.updateUserProfile(id,gender));
            assertTrue(responses.stream().noneMatch(value->value instanceof Exception),responses::toString);
            tx.executeWithoutResult(status->{
                User user=context.getBean(UserRepository.class).findById(id).orElseThrow();
                assertEquals(1L,user.getTokenVersion());assertEquals("nu",user.getGender());
                assertEquals(LocalDate.of(2000,3,4),user.getDob());
                assertTrue(context.getBean(PasswordEncoder.class).matches("new-secret",user.getPassword()));
                assertFalse(context.getBean(PasswordEncoder.class).matches("old-secret",user.getPassword()));
            });
        }

        @Test void duplicateAddressRaceAndRepeatedDefaultKeepExactlyOneDefault() throws Exception {
            Long id=account(Role.ROLE_USER);
            var results=race(()->shipping.createAddress(id,addressBody()),()->shipping.createAddress(id,addressBody()));
            assertTrue(results.stream().allMatch(value->value instanceof ShippingAddressDto),results::toString);
            Long first=((ShippingAddressDto)results.get(0)).getId();
            assertEquals(first,((ShippingAddressDto)results.get(1)).getId());assertEquals(1,shipping.getUserAddresses(id).size());
            var other=addressBody();other.setAddress("Số 20 đường kiểm thử");other.setNote("Gọi trước");other.setTag("Nhà riêng");
            Long second=shipping.createAddress(id,other).getId();
            var defaults=race(()->shipping.setDefaultAddress(first,id),()->shipping.setDefaultAddress(second,id));
            assertTrue(defaults.stream().allMatch(value->value instanceof ShippingAddressDto),defaults::toString);
            assertEquals(1,shipping.getUserAddresses(id).stream().filter(value->Boolean.TRUE.equals(value.getIsDefault())).count());
            shipping.setDefaultAddress(first,id);shipping.setDefaultAddress(first,id);
            assertTrue(shipping.getAddressById(first,id).getIsDefault());
            assertFalse(shipping.getAddressById(second,id).getIsDefault());
            assertEquals("Gọi trước",shipping.getAddressById(second,id).getNote());
        }

        @Test void concurrentAdminDeactivationPreservesOneAndRestoresBaselineAdmins() throws Exception {
            Map<Long,Boolean> baseline=tx.execute(status->{
                Map<Long,Boolean> snapshot=new HashMap<>();
                context.getBean(UserRepository.class).findAllAdminsForUpdate().forEach(user->snapshot.put(user.getId(),user.getIsActive()));
                return snapshot;
            });
            try {
                tx.executeWithoutResult(status->context.getBean(UserRepository.class).findAllAdminsForUpdate()
                        .forEach(user->user.setIsActive(false)));
                Long first=account(Role.ROLE_ADMIN),second=account(Role.ROLE_ADMIN);
                var results=race(()->profiles.updateUserStatus(first,false),()->profiles.updateUserStatus(second,false));
                assertEquals(1,results.stream().filter(value->value instanceof com.sports.dto.UserProfileResponse).count(),results::toString);
                assertEquals(1,results.stream().filter(value->value instanceof BadRequestException).count(),results::toString);
                long active=tx.execute(status->context.getBean(UserRepository.class).findAllAdminsForUpdate().stream()
                        .filter(user->!Boolean.FALSE.equals(user.getIsActive())).count());
                assertEquals(1,active);
            } finally {
                tx.executeWithoutResult(status->baseline.forEach((id,active)->context.getBean(UserRepository.class)
                        .findByIdForUpdate(id).orElseThrow().setIsActive(active)));
            }
        }

        @Test void recognizedPaymentsExcludeMockLateCodAndImmutableLedgerConflicts() {
            Long userId=account(Role.ROLE_USER);
            tx.executeWithoutResult(status->{
                var repository=context.getBean(OrderRepository.class);User user=context.getBean(UserRepository.class).findById(userId).orElseThrow();
                Order goodCash=proofOrder(user,"COD"),goodPayos=proofOrder(user,"PAYOS_VIETQR");
                attempt(goodPayos,"PAYOS",com.sports.entity.PaymentAttempt.Status.PAID);
                Order mock=proofOrder(user,"PAYOS_VIETQR");attempt(mock,"MOCK",com.sports.entity.PaymentAttempt.Status.PAID);
                Order late=proofOrder(user,"COD");attempt(late,"PAYOS",com.sports.entity.PaymentAttempt.Status.PAID);
                Order review=proofOrder(user,"COD");attempt(review,"PAYOS",com.sports.entity.PaymentAttempt.Status.NEEDS_REVIEW);
                Order receipt=proofOrder(user,"COD");
                event(attempt(receipt,"PAYOS",com.sports.entity.PaymentAttempt.Status.CANCELLED),null,true);
                Order hard=proofOrder(user,"PAYOS_VIETQR");
                event(attempt(hard,"PAYOS",com.sports.entity.PaymentAttempt.Status.PAID),"IDENTITY_MISMATCH",false);
                Order conflict=proofOrder(user,"PAYOS_VIETQR");
                var original=event(attempt(conflict,"PAYOS",com.sports.entity.PaymentAttempt.Status.PAID),null,false);
                var audit=new com.sports.entity.PaymentEventConflict();audit.setPaymentEvent(original);audit.setFingerprint(UUID.randomUUID().toString());
                audit.setIncomingFacts("{}");audit.setSource(com.sports.entity.PaymentEvent.Source.WEBHOOK);
                context.getBean(PaymentEventConflictRepository.class).saveAndFlush(audit);
                Set<Long> recognized=repository.findRecognizedPaymentOrders().stream().filter(value->value.getUser().getId().equals(userId))
                        .map(Order::getId).collect(java.util.stream.Collectors.toSet());
                assertEquals(Set.of(goodCash.getId(),goodPayos.getId()),recognized);
            });
        }

        private Order proofOrder(User user,String method) {
            return context.getBean(OrderRepository.class).saveAndFlush(Order.builder().user(user).paymentMethod(method)
                    .status(OrderStatus.COMPLETED).completedAt(java.time.LocalDateTime.now().minusDays(1))
                    .cashCollectedAt("COD".equals(method) ? java.time.LocalDateTime.now() : null)
                    .totalAmount(new java.math.BigDecimal("100000")).build());
        }

        private com.sports.entity.PaymentAttempt attempt(Order order,String provider,com.sports.entity.PaymentAttempt.Status state) {
            var attempt=new com.sports.entity.PaymentAttempt();attempt.setOrder(order);attempt.setProvider(provider);
            attempt.setOrderCode(900000000L+order.getId());attempt.setIdempotencyKey(UUID.randomUUID().toString());
            attempt.setAmount(order.getTotalAmount());attempt.setStatus(state);attempt.setPaidAt(java.time.LocalDateTime.now());
            return context.getBean(PaymentAttemptRepository.class).saveAndFlush(attempt);
        }

        private com.sports.entity.PaymentEvent event(com.sports.entity.PaymentAttempt attempt,String review,boolean money) {
            String key=UUID.randomUUID().toString();var event=new com.sports.entity.PaymentEvent();
            event.setProvider("PAYOS");event.setPaymentAttempt(attempt);event.setOrder(attempt.getOrder());
            event.setPaymentLinkId(key);event.setReference(key);event.setOrderCode(attempt.getOrderCode());event.setAmount(attempt.getAmount());
            event.setCurrency("VND");event.setTransactionDateTime("2026-10-14T00:00:00");event.setReceivedAt(java.time.LocalDateTime.now());
            event.setVerifiedAt(java.time.LocalDateTime.now());event.setSource(com.sports.entity.PaymentEvent.Source.WEBHOOK);
            event.setFingerprint(key);event.setProcessingResult("TEST");event.setReviewReason(review);event.setReceivedPayment(money);
            return context.getBean(PaymentEventRepository.class).saveAndFlush(event);
        }

        private List<Object> race(java.util.concurrent.Callable<Object> first,java.util.concurrent.Callable<Object> second) throws Exception {
            var ready=new java.util.concurrent.CountDownLatch(2);var start=new java.util.concurrent.CountDownLatch(1);
            var pool=java.util.concurrent.Executors.newFixedThreadPool(2);
            try {
                var a=pool.submit(()->invoke(first,ready,start));var b=pool.submit(()->invoke(second,ready,start));
                assertTrue(ready.await(30,java.util.concurrent.TimeUnit.SECONDS));start.countDown();
                return List.of(a.get(120,java.util.concurrent.TimeUnit.SECONDS),b.get(120,java.util.concurrent.TimeUnit.SECONDS));
            } finally {start.countDown();pool.shutdown();}
        }

        private Object invoke(java.util.concurrent.Callable<Object> operation,java.util.concurrent.CountDownLatch ready,
                java.util.concurrent.CountDownLatch start) throws InterruptedException {
            ready.countDown();start.await();try{return operation.call();}catch(Exception failure){return failure;}
        }
    }

    @org.springframework.context.annotation.Configuration
    @org.springframework.context.annotation.Import(ProductCatalogIntegrationTest.Config.class)
    @org.springframework.transaction.annotation.EnableTransactionManagement
    static class AccountConfig {
        @org.springframework.context.annotation.Bean PasswordEncoder passwordEncoder() {
            return new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(4);
        }
        @org.springframework.context.annotation.Bean AvatarStorageService avatarStorageService() { return mock(AvatarStorageService.class); }
        @org.springframework.context.annotation.Bean AdministrativeUnitService administrativeUnitService() throws Exception {
            return new AdministrativeUnitService();
        }
        @org.springframework.context.annotation.Bean UserService userService(UserRepository users,PasswordEncoder encoder,OrderRepository orders) {
            return new UserService(users,encoder,orders);
        }
        @org.springframework.context.annotation.Bean ShippingAddressService shippingAddressService(ShippingAddressRepository addresses,UserRepository users) {
            return new ShippingAddressService(addresses,users);
        }
    }
}
