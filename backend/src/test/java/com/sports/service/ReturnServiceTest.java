package com.sports.service;

import com.sports.controller.ReturnController;
import com.sports.dto.ReturnCreateRequest;
import com.sports.entity.*;
import com.sports.entity.Order;
import com.sports.exception.*;
import com.sports.repository.*;
import com.sports.security.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

class ReturnServiceTest {
    private final ReturnRequestRepository returns=mock(ReturnRequestRepository.class);
    private final OrderRepository orders=mock(OrderRepository.class);
    private final UserRepository users=mock(UserRepository.class);
    private final PaymentAttemptRepository payments=mock(PaymentAttemptRepository.class);
    private final ProductRepository products=mock(ProductRepository.class);
    private final ReturnEvidenceStorage storage=mock(ReturnEvidenceStorage.class);
    private final PaymentLedgerService ledger=mock(PaymentLedgerService.class);
    private final List<ReturnRequest> persisted=new ArrayList<>();
    private final ReturnService service=new ReturnService(returns,orders,users,payments,products,storage,ledger);
    private User customer;
    private Product product;
    private ProductVariant variant;
    private Order order;
    private OrderItem item;

    @BeforeEach void prepare() {
        reset(returns,orders,users,payments,products,storage,ledger);
        persisted.clear();
        customer=User.builder().id(1L).username("rma-owner").email("rma@example.invalid").password("test")
                .fullName("Khách kiểm thử").role(Role.ROLE_USER).build();
        product=Product.builder().id(11L).name("Giày Yonex kiểm thử").brand("Yonex").sku("HG-SHOE-TEST")
                .price(new BigDecimal("100000")).stock(20).category(Category.builder().id(2L).build()).build();
        variant=ProductVariant.builder().id(21L).product(product).sku("HG-SHOE-TEST-V01").size("40")
                .color("Trắng").stock(20).build();
        product.getVariants().add(variant);
        order=Order.builder().id(31L).user(customer).status(OrderStatus.COMPLETED).paymentMethod("COD")
                .cashCollectedAt(LocalDateTime.now().minusDays(2)).completedAt(LocalDateTime.now().minusDays(1))
                .totalAmount(new BigDecimal("200000")).shippingPhone("0900000000").build();
        item=OrderItem.builder().id(41L).order(order).product(product).variant(variant).quantity(2)
                .price(product.getPrice()).selectedSize("40").selectedColor("Trắng").build();
        item.captureProduct();order.getItems().add(item);
        configureRepositories();
        ReflectionTestUtils.setField(service,"entityManager",mock(EntityManager.class));
        SecurityContextHolder.clearContext();
    }

    private void configureRepositories() {
        when(users.findById(1L)).thenReturn(Optional.of(customer));
        when(orders.findById(31L)).thenReturn(Optional.of(order));
        when(orders.findByIdForUpdate(31L)).thenReturn(Optional.of(order));
        when(orders.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(order));
        when(returns.findByOrderIdOrderByCreatedAtDesc(31L)).thenAnswer(call -> List.copyOf(persisted));
        when(returns.findByOrderIdForUpdate(31L)).thenAnswer(call -> List.copyOf(persisted));
        when(returns.saveAndFlush(any())).thenAnswer(call -> persist(call.getArgument(0)));
        when(returns.findById(anyLong())).thenAnswer(call -> find(call.getArgument(0)));
        when(returns.findByIdForUpdate(anyLong())).thenAnswer(call -> find(call.getArgument(0)));
        when(returns.findOrderIdByRequestId(anyLong())).thenAnswer(call -> find(call.getArgument(0)).map(value->31L));
        when(products.findByVariantIdForUpdate(21L)).thenReturn(Optional.of(product));
    }

    private Optional<ReturnRequest> find(Long id) {
        return persisted.stream().filter(value -> Objects.equals(value.getId(),id)).findFirst();
    }

    private ReturnRequest persist(ReturnRequest value) {
        if (value.getId()==null) { value.setId(100L+persisted.size());value.setCreatedAt(LocalDateTime.now());persisted.add(value); }
        return value;
    }

    private ReturnCreateRequest request(int quantity) {
        ReturnCreateRequest body=new ReturnCreateRequest();
        body.setOrderId(31L);body.setOrderItemId(41L);body.setQuantity(quantity);
        body.setReason("Đế giày bong");body.setSerialNumber(null);return body;
    }

    private Long create(int quantity) { return service.createReturnRequest(1L,request(quantity)).getId(); }

    @AfterEach void clearSecurity() { SecurityContextHolder.clearContext(); }

    @Test void createsLineClaimWithRealSnapshotsAndIdenticalReplayWithoutDuplicate() {
        var first=service.createReturnRequest(1L,request(1));
        var retry=service.createReturnRequest(1L,request(1));
        assertEquals(first.getId(),retry.getId());assertFalse(first.getReplayed());assertTrue(retry.getReplayed());
        assertEquals(1,persisted.size());assertEquals(41L,first.getOrderItemId());assertEquals(2L,first.getCategoryIdSnapshot());
        assertEquals(21L,first.getOriginalVariantId());assertEquals("Trắng",first.getSelectedColor());
        assertEquals("0900000000",first.getCustomerPhone());assertNull(first.getImageUrl());
        verify(orders,times(2)).findByIdForUpdate(31L);
    }

    @Test void differentActiveClaimConflictsAndCompletedQuotaIsNotReusable() {
        Long id=create(1);
        assertEquals(HttpStatus.CONFLICT,assertThrows(ResponseStatusException.class,
                () -> service.createReturnRequest(1L,request(2))).getStatusCode());
        service.updateStatus(id,ReturnStatus.APPROVED,null,null);
        service.updateStatus(id,ReturnStatus.COMPLETED,null,21L);
        var second=service.createReturnRequest(1L,request(1));assertNotEquals(id,second.getId());
        service.updateStatus(second.getId(),ReturnStatus.APPROVED,null,null);
        service.updateStatus(second.getId(),ReturnStatus.COMPLETED,null,21L);
        assertThrows(BadRequestException.class,()->service.createReturnRequest(1L,request(1)));
        assertEquals(0,service.getEligibleItems(1L,31L).get(0).remainingQuantity());
    }

    @Test void rejectedClaimReleasesQuotaAndInvalidTransitionsAreBlocked() {
        Long id=create(2);
        assertThrows(BadRequestException.class,()->service.updateStatus(id,ReturnStatus.COMPLETED,null,21L));
        service.updateStatus(id,ReturnStatus.REJECTED,"Đã kiểm tra",null);
        assertThrows(BadRequestException.class,()->service.updateStatus(id,ReturnStatus.APPROVED,null,null));
        assertNotEquals(id,create(2));assertEquals(20,variant.getStock());
    }

    @Test void unknownCompletedDatePaymentAndAccessoryNeverBecomeEligible() {
        order.setCompletedAt(null);assertFalse(service.getEligibleItems(1L,31L).get(0).eligible());
        assertThrows(BadRequestException.class,()->create(1));assertNull(order.getCompletedAt());
        order.setCompletedAt(LocalDateTime.now().minusDays(1));order.setCashCollectedAt(null);
        assertThrows(BadRequestException.class,()->create(1));
        order.setCashCollectedAt(LocalDateTime.now());item.setCategoryIdSnapshot(5L);
        assertThrows(BadRequestException.class,()->create(1));
        item.setCategoryIdSnapshot(null);assertThrows(BadRequestException.class,()->create(1));
    }

    @Test void warrantyUsesCompletedDateNotOrderCreatedDateAndAllowsLaterProcessing() {
        order.setCreatedAt(LocalDateTime.now().minusDays(200));assertNotNull(create(1));
        persisted.clear();order.setCompletedAt(LocalDateTime.now().minusDays(91));
        assertThrows(BadRequestException.class,()->create(1));
        order.setCompletedAt(LocalDateTime.now().minusDays(100));
        var claim=ReturnRequest.builder().id(100L).user(customer).order(order).orderItem(item).quantity(1)
                .originalVariantId(21L).reason("Lỗi đã gửi trong hạn").status(ReturnStatus.APPROVED)
                .createdAt(LocalDateTime.now().minusDays(20)).build();persisted.add(claim);
        assertEquals("COMPLETED",service.updateStatus(100L,ReturnStatus.COMPLETED,null,21L).getStatus());
    }

    @Test void payosRequiresPaidTimestampExactAmountAndKnownProvider() {
        order.setPaymentMethod("PAYOS_VIETQR");
        PaymentAttempt proof=new PaymentAttempt();proof.setStatus(PaymentAttempt.Status.PAID);
        proof.setAmount(order.getTotalAmount());when(payments.findByOrderId(31L)).thenReturn(Optional.of(proof));
        assertThrows(BadRequestException.class,()->create(1));
        proof.setPaidAt(LocalDateTime.now());proof.setAmount(BigDecimal.ONE);
        assertThrows(BadRequestException.class,()->create(1));
        proof.setAmount(order.getTotalAmount());proof.setProvider("OTHER");
        assertThrows(BadRequestException.class,()->create(1));
        proof.setProvider("PAYOS");assertNotNull(create(1));
    }

    @Test void codWithLatePayosMoneyOrReviewConflictCannotClaimWarranty() {
        PaymentAttempt attempt=new PaymentAttempt();attempt.setId(71L);
        when(payments.findByOrderId(31L)).thenReturn(Optional.of(attempt));
        attempt.setStatus(PaymentAttempt.Status.NEEDS_REVIEW);assertThrows(BadRequestException.class,()->create(1));
        attempt.setStatus(PaymentAttempt.Status.PAID);assertThrows(BadRequestException.class,()->create(1));
        attempt.setStatus(PaymentAttempt.Status.CANCELLED);when(ledger.hasHardConflict(71L)).thenReturn(true);
        assertThrows(BadRequestException.class,()->create(1));when(ledger.hasHardConflict(71L)).thenReturn(false);
        PaymentEvent received=new PaymentEvent();received.setAmount(new BigDecimal("100000"));
        when(ledger.received(71L)).thenReturn(List.of(received));assertThrows(BadRequestException.class,()->create(1));
        when(ledger.received(71L)).thenReturn(List.of());assertNotNull(create(1));
    }

    @Test void ownerLineQuantityAndUntrustedInputsAreValidated() {
        order.setUser(User.builder().id(2L).build());
        assertThrows(UnauthorizedException.class,()->create(1));
        assertThrows(UnauthorizedException.class,()->service.getEligibleItems(1L,31L));
        order.setUser(customer);
        var invalid=request(1);invalid.setOrderItemId(99L);var wrongLine=invalid;
        assertThrows(BadRequestException.class,()->service.createReturnRequest(1L,wrongLine));
        assertThrows(BadRequestException.class,()->create(3));
        invalid=request(0);var zero=invalid;assertThrows(BadRequestException.class,()->service.createReturnRequest(1L,zero));
        invalid=request(1);invalid.setImageUrl("https://other.invalid/evidence.jpg");var url=invalid;
        assertThrows(BadRequestException.class,()->service.createReturnRequest(1L,url));
        invalid=request(1);invalid.setReason("x".repeat(2001));var longReason=invalid;
        assertThrows(BadRequestException.class,()->service.createReturnRequest(1L,longReason));
        invalid=request(1);invalid.setSerialNumber("x".repeat(101));var longSerial=invalid;
        assertThrows(BadRequestException.class,()->service.createReturnRequest(1L,longSerial));
    }

    @Test void oldSingleLinePayloadWorksButMultiLineRequiresExplicitSelection() {
        var body=request(1);body.setOrderItemId(null);body.setQuantity(null);
        assertEquals(1,service.createReturnRequest(1L,body).getQuantity());persisted.clear();
        order.getItems().add(OrderItem.builder().id(42L).order(order).quantity(1).build());
        assertThrows(BadRequestException.class,()->service.createReturnRequest(1L,body));
    }

    @Test void unresolvedHistoricalRequestRequiresReconciliationAndDoesNotGuessItsLine() {
        persisted.add(ReturnRequest.builder().id(91L).order(order).user(customer).reason("Phiếu cũ")
                .status(ReturnStatus.PENDING).build());
        assertThrows(BadRequestException.class,()->create(1));
        assertFalse(service.getEligibleItems(1L,31L).get(0).eligible());
        assertThrows(BadRequestException.class,()->service.updateStatus(91L,ReturnStatus.APPROVED,null,null));
        assertNull(persisted.get(0).getOrderItem());
    }

    @Test void completionConsumesStockOnceKeepsHistoricalReservationsAndOriginalOptions() {
        Long id=create(2);variant.setReservedStock(3);product.setReservedStock(3);
        service.updateStatus(id,ReturnStatus.APPROVED,"Đã nhận hàng lỗi",null);
        var completed=service.updateStatus(id,ReturnStatus.COMPLETED,null,21L);
        LocalDateTime timestamp=completed.getCompletedAt();
        var retry=service.updateStatus(id,ReturnStatus.COMPLETED,null,21L);
        assertTrue(retry.getReplayed());assertEquals(timestamp,retry.getCompletedAt());
        assertEquals(18,variant.getStock());assertEquals(3,variant.getReservedStock());
        assertEquals(18,product.getStock());assertEquals(3,product.getReservedStock());
        assertEquals("HG-SHOE-TEST-V01",completed.getReplacementSku());
        verify(products,times(1)).saveAndFlush(product);
        var locks=inOrder(returns,orders,products);
        locks.verify(returns).findOrderIdByRequestId(id);locks.verify(orders).findByIdForUpdate(31L);
        locks.verify(returns).findByIdForUpdate(id);
    }

    @Test void replacementRequiresSameBrandCategoryActiveCatalogAndConsentForDifferentVariant() {
        Long id=create(1);service.updateStatus(id,ReturnStatus.APPROVED,null,null);
        product.setCatalogVisible(false);assertThrows(BadRequestException.class,()->service.updateStatus(id,ReturnStatus.COMPLETED,null,21L));
        product.setCatalogVisible(true);variant.setActive(false);
        assertThrows(BadRequestException.class,()->service.updateStatus(id,ReturnStatus.COMPLETED,null,21L));
        variant.setActive(true);variant.setLegacy(true);
        assertThrows(BadRequestException.class,()->service.updateStatus(id,ReturnStatus.COMPLETED,null,21L));
        variant.setLegacy(false);product.setBrand("Victor");
        assertThrows(BadRequestException.class,()->service.updateStatus(id,ReturnStatus.COMPLETED,null,21L));
        product.setBrand("Yonex");product.getCategory().setId(3L);
        assertThrows(BadRequestException.class,()->service.updateStatus(id,ReturnStatus.COMPLETED,null,21L));
        product.getCategory().setId(2L);variant.setId(22L);
        when(products.findByVariantIdForUpdate(22L)).thenReturn(Optional.of(product));
        assertThrows(BadRequestException.class,()->service.updateStatus(id,ReturnStatus.COMPLETED,null,22L));
        assertEquals("COMPLETED",service.updateStatus(id,ReturnStatus.COMPLETED,"Khách đồng ý đổi màu",22L).getStatus());
        assertEquals(21L,persisted.get(0).getOriginalVariantId());assertEquals(19,variant.getStock());
    }

    @Test void insufficientReplacementCannotMarkCompletedOrChangeStock() {
        Long id=create(2);service.updateStatus(id,ReturnStatus.APPROVED,null,null);variant.setStock(1);
        assertThrows(InsufficientStockException.class,()->service.updateStatus(id,ReturnStatus.COMPLETED,null,21L));
        assertEquals(ReturnStatus.APPROVED,persisted.get(0).getStatus());assertNull(persisted.get(0).getCompletedAt());
        assertEquals(1,variant.getStock());assertEquals(0,variant.getReservedStock());
    }

    @Test void deletedPurchasedProductRetainsCategoryBrandOptionsAndAllowsMatchingReplacement() {
        item.setProduct(null);item.setVariant(null);Long id=create(1);
        assertTrue(service.getEligibleItems(1L,31L).get(0).productDeleted());
        service.updateStatus(id,ReturnStatus.APPROVED,null,null);
        var result=service.updateStatus(id,ReturnStatus.COMPLETED,"Khách đồng ý đổi cùng hãng và danh mục",21L);
        assertEquals("Giày Yonex kiểm thử",result.getProductName());assertEquals("40",result.getSelectedSize());
        assertEquals(2L,result.getCategoryIdSnapshot());assertTrue(result.getProductDeleted());
    }

    @Test void evidenceIsPrivateAndImmutableAfterApproval() {
        Long id=create(1);var file=new MockMultipartFile("file","proof.png","image/png",new byte[]{1});
        assertThrows(UnauthorizedException.class,()->service.getEvidence(2L,id));
        assertThrows(UnauthorizedException.class,()->service.uploadEvidence(2L,id,file));
        when(storage.store(file)).thenReturn("test-key.png");
        var result=service.uploadEvidence(1L,id,file);
        assertTrue(result.getEvidenceAvailable());assertEquals("/api/returns/"+id+"/evidence",result.getImageUrl());
        service.updateStatus(id,ReturnStatus.APPROVED,null,null);
        assertThrows(BadRequestException.class,()->service.uploadEvidence(1L,id,file));
        var admin=User.builder().id(2L).username("admin").role(Role.ROLE_ADMIN).build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new CustomUserDetails(admin),"",new CustomUserDetails(admin).getAuthorities()));
        assertDoesNotThrow(()->service.getEvidence(2L,id));verify(storage).read("test-key.png");
    }

    private AnnotationConfigWebApplicationContext webContext() {
        var web=new AnnotationConfigWebApplicationContext();
        web.setServletContext(new org.springframework.mock.web.MockServletContext());
        web.register(SecurityConfig.class,ReturnController.class,GlobalExceptionHandler.class,WebConfig.class);
        web.addBeanFactoryPostProcessor(factory -> {
            factory.registerSingleton("returnService",service);
            factory.registerSingleton("jwtAuthenticationFilter",new JwtAuthenticationFilter(
                    mock(JwtTokenProvider.class),mock(UserDetailsServiceImpl.class)));
        });web.refresh();return web;
    }

    @Configuration @org.springframework.web.servlet.config.annotation.EnableWebMvc
    static class WebConfig {}

    @Test void httpRequiresRolesValidatesJsonAndReturns201Then200ForReplay() throws Exception {
        try (var web=webContext()) {
            var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup(web).apply(springSecurity()).build();
            var owner=user(new CustomUserDetails(customer));
            String body="{\"orderId\":31,\"orderItemId\":41,\"quantity\":1,\"reason\":\"Đế giày bong\"}";
            mvc.perform(get("/api/returns/eligible-items")).andExpect(status().isUnauthorized());
            mvc.perform(get("/api/returns/all").with(owner)).andExpect(status().isForbidden());
            mvc.perform(put("/api/returns/100/status").param("status","APPROVED").with(owner)).andExpect(status().isForbidden());
            mvc.perform(post("/api/returns").with(owner).contentType("application/json").content(body))
                    .andExpect(status().isCreated()).andExpect(jsonPath("$.replayed").value(false));
            mvc.perform(post("/api/returns").with(owner).contentType("application/json").content(body))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.replayed").value(true));
            mvc.perform(post("/api/returns").with(owner).contentType("application/json")
                    .content(body.replace("\"quantity\":1","\"quantity\":0"))).andExpect(status().isBadRequest());
            var other=User.builder().id(2L).username("other").role(Role.ROLE_USER).build();
            mvc.perform(get("/api/returns/100/evidence").with(user(new CustomUserDetails(other))))
                    .andExpect(status().isForbidden());
            when(storage.read(null)).thenThrow(new ResourceNotFoundException("Chưa có ảnh"));
            mvc.perform(get("/api/returns/100/evidence").with(owner)).andExpect(status().isNotFound());
            java.nio.file.Path folder=java.nio.file.Path.of("..","backups","project-completion-20261013").toAbsolutePath().normalize();
            java.nio.file.Files.createDirectories(folder);
            java.nio.file.Path image=folder.resolve("rma-http-"+UUID.randomUUID()+".png");
            byte[] content=new byte[]{(byte)137,80,78,71};
            java.nio.file.Files.write(image,content);persisted.get(0).setEvidenceKey("http-evidence.png");
            when(storage.read("http-evidence.png")).thenReturn(image);
            mvc.perform(get("/api/returns/100/evidence").with(owner)).andExpect(status().isOk())
                    .andExpect(header().string("Cache-Control","no-store"))
                    .andExpect(header().string("X-Content-Type-Options","nosniff"))
                    .andExpect(content().contentType("image/png")).andExpect(content().bytes(content));
            var admin=User.builder().id(3L).username("admin").role(Role.ROLE_ADMIN).build();
            mvc.perform(get("/api/returns/100/evidence").with(user(new CustomUserDetails(admin)))).andExpect(status().isOk());
            mvc.perform(get("/api/returns/100/evidence")).andExpect(status().isUnauthorized());
        }
    }

    @Test void httpUploadErrorsKeep415405And413WithRmaMessage() throws Exception {
        Long id=create(1);
        try (var web=webContext()) {
            var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup(web).apply(springSecurity()).build();
            var owner=user(new CustomUserDetails(customer));String path="/api/returns/"+id+"/evidence";
            mvc.perform(post(path).with(owner).contentType("application/json").content("{}"))
                    .andExpect(status().isUnsupportedMediaType()).andExpect(jsonPath("$.status").value(415));
            mvc.perform(delete(path).with(owner)).andExpect(status().isMethodNotAllowed())
                    .andExpect(header().string("Allow",org.hamcrest.Matchers.allOf(
                            org.hamcrest.Matchers.containsString("GET"),org.hamcrest.Matchers.containsString("POST"))));
            var oversized=new MockMultipartFile("file","proof.png","image/png",new byte[5*1024*1024+1]);
            when(storage.store(any())).thenThrow(new org.springframework.web.multipart.MaxUploadSizeExceededException(5L*1024*1024));
            mvc.perform(multipart(path).file(oversized).with(owner)).andExpect(status().isPayloadTooLarge())
                    .andExpect(jsonPath("$.status").value(413)).andExpect(jsonPath("$.message").value("Ảnh bằng chứng tối đa 5MB"));
            assertNull(persisted.get(0).getEvidenceKey());assertEquals(ReturnStatus.PENDING,persisted.get(0).getStatus());
        }
    }

    @Nested
    @org.junit.jupiter.api.condition.EnabledIfSystemProperty(named="return.workflow.mysql",matches="true")
    @TestInstance(TestInstance.Lifecycle.PER_CLASS)
    class MysqlWorkflow {
        private org.springframework.context.annotation.AnnotationConfigApplicationContext context;
        private org.springframework.transaction.support.TransactionTemplate tx;
        private ReturnService workflow;

        @BeforeAll void startMysql() {
            context=new org.springframework.context.annotation.AnnotationConfigApplicationContext(MysqlConfig.class);
            tx=new org.springframework.transaction.support.TransactionTemplate(
                    context.getBean(org.springframework.transaction.PlatformTransactionManager.class));
            workflow=context.getBean(ReturnService.class);
        }

        @AfterAll void closeMysql() { if (context!=null) context.close(); }

        @Test void persistedConcurrentRetriesAndCompletionConsumeExactlyOnce() throws Exception {
            Fixture fixture=fixture(3,2);
            var responses=race(() -> workflow.createReturnRequest(fixture.userId(),body(fixture,1)),
                    () -> workflow.createReturnRequest(fixture.userId(),body(fixture,1)));
            assertTrue(responses.stream().allMatch(value->value instanceof com.sports.dto.ReturnResponse),responses::toString);
            var first=(com.sports.dto.ReturnResponse)responses.get(0);
            assertEquals(first.getId(),((com.sports.dto.ReturnResponse)responses.get(1)).getId());
            assertEquals(Set.of(false,true),responses.stream().map(value->((com.sports.dto.ReturnResponse)value).getReplayed())
                    .collect(java.util.stream.Collectors.toSet()));
            int savedRequests=tx.execute(status->context.getBean(ReturnRequestRepository.class)
                    .findByOrderIdOrderByCreatedAtDesc(fixture.orderId()).size());
            assertEquals(1,savedRequests);
            workflow.updateStatus(first.getId(),ReturnStatus.APPROVED,"Đã nhận hàng lỗi",null);
            var completion=race(() -> workflow.updateStatus(first.getId(),ReturnStatus.COMPLETED,null,fixture.variantId()),
                    () -> workflow.updateStatus(first.getId(),ReturnStatus.COMPLETED,null,fixture.variantId()));
            assertTrue(completion.stream().allMatch(value->value instanceof com.sports.dto.ReturnResponse),completion::toString);
            assertEquals(2,stock(fixture.productId()));
            assertEquals(0,reserved(fixture.productId()));
        }

        @Test void twoOrdersCannotSpendTheLastReplacementTwice() throws Exception {
            Fixture first=fixture(1,1),second=anotherOrder(first,1);
            var a=workflow.createReturnRequest(first.userId(),body(first,1));
            var b=workflow.createReturnRequest(second.userId(),body(second,1));
            workflow.updateStatus(a.getId(),ReturnStatus.APPROVED,null,null);
            workflow.updateStatus(b.getId(),ReturnStatus.APPROVED,null,null);
            var responses=race(()->workflow.updateStatus(a.getId(),ReturnStatus.COMPLETED,null,first.variantId()),
                    ()->workflow.updateStatus(b.getId(),ReturnStatus.COMPLETED,null,second.variantId()));
            assertEquals(1,responses.stream().filter(value->value instanceof com.sports.dto.ReturnResponse).count());
            assertEquals(1,responses.stream().filter(value->value instanceof InsufficientStockException).count());
            assertEquals(0,stock(first.productId()));assertEquals(0,reserved(first.productId()));
            long completed=tx.execute(status->context.getBean(ReturnRequestRepository.class).findAll().stream()
                    .filter(value->Set.of(a.getId(),b.getId()).contains(value.getId()) && value.getStatus()==ReturnStatus.COMPLETED).count());
            assertEquals(1,completed);
        }

        @Test void lineScopedActiveRmaBlocksOnlyItsProductAndRetainsSnapshotsAfterDetach() {
            Fixture fixture=fixture(5,2),unrelated=fixture(5,1);
            Long unrelatedItem=tx.execute(status->{
                var order=context.getBean(OrderRepository.class).findById(fixture.orderId()).orElseThrow();
                var other=context.getBean(ProductRepository.class).findById(unrelated.productId()).orElseThrow();
                OrderItem extra=OrderItem.builder().order(order).product(other).variant(other.getVariants().get(0))
                        .price(other.getPrice()).quantity(1).selectedSize("40").build();
                order.getItems().add(extra);
                var manager=org.springframework.orm.jpa.SharedEntityManagerCreator.createSharedEntityManager(
                        context.getBean(jakarta.persistence.EntityManagerFactory.class));
                manager.persist(extra);context.getBean(OrderRepository.class).flush();return extra.getId();
            });
            var claim=workflow.createReturnRequest(fixture.userId(),body(fixture,1));
            tx.executeWithoutResult(status->{
                var repository=context.getBean(ProductRepository.class);
                assertEquals(1,repository.countActiveReturns(fixture.productId()));
                assertEquals(0,repository.countActiveReturns(unrelated.productId()));
            });
            workflow.updateStatus(claim.getId(),ReturnStatus.APPROVED,null,null);
            workflow.updateStatus(claim.getId(),ReturnStatus.COMPLETED,null,fixture.variantId());
            tx.executeWithoutResult(status->{
                var repository=context.getBean(ProductRepository.class);
                assertEquals(0,repository.countActiveReturns(fixture.productId()));
                repository.detachOrderHistory(fixture.productId());
            });
            var saved=workflow.getUserReturnRequests(fixture.userId()).stream()
                    .filter(value->Objects.equals(value.getId(),claim.getId())).findFirst().orElseThrow();
            assertTrue(saved.getProductDeleted());assertEquals(fixture.variantId(),saved.getOriginalVariantId());
            assertEquals(2L,saved.getCategoryIdSnapshot());assertEquals("40",saved.getSelectedSize());
            assertNotNull(saved.getReplacementSku());assertNotNull(unrelatedItem);
        }

        private int stock(Long productId) {
            return tx.execute(status->context.getBean(ProductRepository.class).findById(productId).orElseThrow().getStock());
        }

        private int reserved(Long productId) {
            return tx.execute(status->context.getBean(ProductRepository.class).findById(productId).orElseThrow().getReservedStock());
        }

        private List<Object> race(java.util.concurrent.Callable<com.sports.dto.ReturnResponse> first,
                java.util.concurrent.Callable<com.sports.dto.ReturnResponse> second) throws Exception {
            var ready=new java.util.concurrent.CountDownLatch(2);var start=new java.util.concurrent.CountDownLatch(1);
            var pool=java.util.concurrent.Executors.newFixedThreadPool(2);
            try {
                var a=pool.submit(()->invoke(first,ready,start));var b=pool.submit(()->invoke(second,ready,start));
                assertTrue(ready.await(30,java.util.concurrent.TimeUnit.SECONDS));start.countDown();
                return List.of(a.get(120,java.util.concurrent.TimeUnit.SECONDS),b.get(120,java.util.concurrent.TimeUnit.SECONDS));
            } finally { start.countDown();pool.shutdown(); }
        }

        private Object invoke(java.util.concurrent.Callable<com.sports.dto.ReturnResponse> operation,
                java.util.concurrent.CountDownLatch ready,java.util.concurrent.CountDownLatch start) throws InterruptedException {
            ready.countDown();start.await();
            try { return operation.call(); } catch(Exception failure) { return failure; }
        }

        private Fixture fixture(int stock,int purchased) {
            return tx.execute(status->{
                String key=UUID.randomUUID().toString().replace("-","");
                User user=context.getBean(UserRepository.class).saveAndFlush(User.builder().username("rma"+key)
                        .email(key+"@example.invalid").password("fixture-not-for-login").fullName("RMA kiểm thử").build());
                Category category=context.getBean(CategoryRepository.class).findById(2L).orElseThrow();
                Product product=Product.builder().name("RMA kiểm thử "+key).sku("HG-RMA-"+key).brand("Yonex")
                        .category(category).price(new BigDecimal("100000")).stock(stock).build();
                ProductVariant variant=ProductVariant.builder().product(product).sku(product.getSku()+"-V01")
                        .size("40").color("Trắng").stock(stock).build();product.getVariants().add(variant);
                context.getBean(ProductRepository.class).saveAndFlush(product);
                return saveOrder(user,product,variant,purchased);
            });
        }

        private Fixture anotherOrder(Fixture fixture,int purchased) {
            return tx.execute(status->{
                User user=context.getBean(UserRepository.class).findById(fixture.userId()).orElseThrow();
                Product product=context.getBean(ProductRepository.class).findById(fixture.productId()).orElseThrow();
                return saveOrder(user,product,product.getVariants().get(0),purchased);
            });
        }

        private Fixture saveOrder(User user,Product product,ProductVariant variant,int quantity) {
            Order order=Order.builder().user(user).status(OrderStatus.COMPLETED).paymentMethod("COD")
                    .totalAmount(product.getPrice().multiply(BigDecimal.valueOf(quantity)))
                    .cashCollectedAt(LocalDateTime.now().minusDays(2)).completedAt(LocalDateTime.now().minusDays(1)).build();
            OrderItem item=OrderItem.builder().order(order).product(product).variant(variant).quantity(quantity)
                    .price(product.getPrice()).selectedSize(variant.getSize()).selectedColor(variant.getColor()).build();
            order.getItems().add(item);context.getBean(OrderRepository.class).saveAndFlush(order);
            return new Fixture(user.getId(),order.getId(),item.getId(),product.getId(),variant.getId());
        }

        private ReturnCreateRequest body(Fixture fixture,int quantity) {
            ReturnCreateRequest request=new ReturnCreateRequest();request.setOrderId(fixture.orderId());
            request.setOrderItemId(fixture.itemId());request.setQuantity(quantity);request.setReason("Lỗi cần bảo hành");return request;
        }

        private record Fixture(Long userId,Long orderId,Long itemId,Long productId,Long variantId) {}
    }

    @Configuration
    @org.springframework.context.annotation.Import(ProductCatalogIntegrationTest.Config.class)
    @org.springframework.transaction.annotation.EnableTransactionManagement
    static class MysqlConfig {
        @org.springframework.context.annotation.Bean PaymentLedgerService paymentLedgerService(
                PaymentEventRepository events,PaymentEventConflictRepository conflicts) {
            return new PaymentLedgerService(events,conflicts);
        }
        @org.springframework.context.annotation.Bean ReturnEvidenceStorage evidenceStorage() {
            return new ReturnEvidenceStorage();
        }
        @org.springframework.context.annotation.Bean ReturnService returnService(ReturnRequestRepository returns,
                OrderRepository orders,UserRepository users,PaymentAttemptRepository payments,ProductRepository products,
                ReturnEvidenceStorage evidenceStorage,PaymentLedgerService ledger) {
            return new ReturnService(returns,orders,users,payments,products,evidenceStorage,ledger);
        }
    }

    private java.nio.file.Path evidenceRoot(String name) {
        return java.nio.file.Path.of("..","backups","project-completion-20261013",
                "rma-storage-"+UUID.randomUUID(),name).toAbsolutePath().normalize();
    }

    private byte[] evidenceImage(int width,int height,String format) throws Exception {
        var output=new java.io.ByteArrayOutputStream();
        var image=new java.awt.image.BufferedImage(width,height,java.awt.image.BufferedImage.TYPE_INT_RGB);
        assertTrue(javax.imageio.ImageIO.write(image,format,output));return output.toByteArray();
    }

    @Test void missingOrInvalidEvidenceKeysDoNotCreateStorageDirectory() {
        var root=evidenceRoot("missing");var storage=new ReturnEvidenceStorage(root);
        for (String key:List.of("../outside.png","/outside.png","bad.png",UUID.randomUUID()+".png"))
            assertThrows(ResourceNotFoundException.class,()->storage.read(key));
        assertThrows(ResourceNotFoundException.class,()->storage.read(null));
        assertFalse(java.nio.file.Files.exists(root));
    }

    @Test void evidencePngAndJpegBecomeDistinctPngFilesAndPreviousFileIsRetained() throws Exception {
        var root=evidenceRoot("roundtrip");var storage=new ReturnEvidenceStorage(root);
        String png=storage.store(new MockMultipartFile("file","proof.png","image/png",evidenceImage(10,8,"PNG")));
        String jpeg=storage.store(new MockMultipartFile("file","proof.jpg","image/jpeg",evidenceImage(10,8,"JPEG")));
        assertNotEquals(png,jpeg);
        assertTrue(png.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.png"));
        for (String key:List.of(png,jpeg)) {
            byte[] bytes=java.nio.file.Files.readAllBytes(storage.read(key));
            assertArrayEquals(new byte[]{(byte)137,80,78,71,13,10,26,10},Arrays.copyOf(bytes,8));
            var image=javax.imageio.ImageIO.read(storage.read(key).toFile());
            assertEquals(10,image.getWidth());assertEquals(8,image.getHeight());
        }
        assertTrue(java.nio.file.Files.exists(storage.read(png)));
    }

    @Test void evidenceRejectsFakeMimeTextGifAndCrossFormatWithoutWriting() throws Exception {
        var root=evidenceRoot("mime");var storage=new ReturnEvidenceStorage(root);
        for (var file:List.of(new MockMultipartFile("file","proof.png","image/png","text".getBytes()),
                new MockMultipartFile("file","proof.gif","image/png",evidenceImage(10,8,"GIF")),
                new MockMultipartFile("file","proof.jpg","image/jpeg",evidenceImage(10,8,"PNG")),
                new MockMultipartFile("file","proof.svg","image/svg+xml","<svg/>".getBytes())))
            assertThrows(BadRequestException.class,()->storage.store(file));
        assertFalse(java.nio.file.Files.exists(root));
    }

    @Test void evidenceEnforcesActualAndReportedByteLimitsWithoutWriting() throws Exception {
        var root=evidenceRoot("oversize");var storage=new ReturnEvidenceStorage(root);
        var file=mock(org.springframework.web.multipart.MultipartFile.class);
        when(file.getContentType()).thenReturn("image/png");when(file.getSize()).thenReturn(1L);
        when(file.getInputStream()).thenReturn(new java.io.ByteArrayInputStream(new byte[5*1024*1024+1]));
        assertThrows(BadRequestException.class,()->storage.store(file));
        when(file.getSize()).thenReturn(5L*1024*1024+1);assertThrows(BadRequestException.class,()->storage.store(file));
        assertFalse(java.nio.file.Files.exists(root));
    }

    @Test void evidenceOversizedDimensionsAreRejectedBeforeStorageCreation() throws Exception {
        var root=evidenceRoot("dimensions");var storage=new ReturnEvidenceStorage(root);
        for (int[] dimensions:List.of(new int[]{4097,1},new int[]{1,4097})) {
            var file=new MockMultipartFile("file","proof.png","image/png",evidenceImage(dimensions[0],dimensions[1],"PNG"));
            assertThrows(BadRequestException.class,()->storage.store(file));
        }
        assertFalse(java.nio.file.Files.exists(root));
    }

    private void symbolicLinkOrSkip(java.nio.file.Path link,java.nio.file.Path target) {
        try { java.nio.file.Files.createSymbolicLink(link,target); }
        catch(java.io.IOException | UnsupportedOperationException | SecurityException unavailable) {
            org.junit.jupiter.api.Assumptions.assumeTrue(false,"Máy không cho tạo symlink: "+unavailable.getClass().getSimpleName());
        }
    }

    @Test void evidenceReadRejectsSymlinkFileAndPreservesExternalTarget() throws Exception {
        var root=evidenceRoot("file-link");java.nio.file.Files.createDirectories(root);
        var outside=root.getParent().resolve("external.png");java.nio.file.Files.write(outside,evidenceImage(10,8,"PNG"));
        String key=UUID.randomUUID()+".png";symbolicLinkOrSkip(root.resolve(key),outside);
        var storage=new ReturnEvidenceStorage(root);
        assertThrows(ResourceNotFoundException.class,()->storage.read(key));
        assertTrue(java.nio.file.Files.exists(outside));
        try (var entries=java.nio.file.Files.list(root)) { assertEquals(1,entries.count()); }
    }

    @Test void evidenceReadAndStoreRejectSymlinkRootOrAncestorWithoutExternalWrites() throws Exception {
        var parent=evidenceRoot("ancestor").getParent();java.nio.file.Files.createDirectories(parent);
        var outside=parent.resolve("external");java.nio.file.Files.createDirectories(outside);
        var link=parent.resolve("linked");symbolicLinkOrSkip(link,outside);
        String key=UUID.randomUUID()+".png";
        java.nio.file.Files.write(outside.resolve(key),evidenceImage(10,8,"PNG"));
        var file=new MockMultipartFile("file","proof.png","image/png",evidenceImage(10,8,"PNG"));
        for (java.nio.file.Path root:List.of(link,link.resolve("child"))) {
            var storage=new ReturnEvidenceStorage(root);
            assertThrows(ResourceNotFoundException.class,()->storage.read(key));
            assertThrows(IllegalStateException.class,()->storage.store(file));
        }
        try (var entries=java.nio.file.Files.list(outside)) { assertEquals(1,entries.count()); }
        assertFalse(java.nio.file.Files.exists(outside.resolve("child")));
    }
}
