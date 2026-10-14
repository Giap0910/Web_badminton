package com.sports.service;

import com.sports.controller.AdminReviewController;
import com.sports.controller.ReviewController;
import com.sports.dto.ReviewRequest;
import com.sports.dto.ReviewResponse;
import com.sports.entity.*;
import com.sports.entity.Order;
import com.sports.exception.*;
import com.sports.repository.*;
import com.sports.security.*;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
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

class ReviewServiceTest {
    private final ReviewRepository reviews=mock(ReviewRepository.class);
    private final ProductRepository products=mock(ProductRepository.class);
    private final UserRepository users=mock(UserRepository.class);
    private final OrderRepository orders=mock(OrderRepository.class);
    private final ReviewService service=new ReviewService(reviews,products,users,orders);
    private final List<Review> saved=new ArrayList<>();
    private User owner;
    private Product product;
    private Order order;
    private OrderItem item;

    @BeforeEach void prepare() {
        reset(reviews,products,users,orders);saved.clear();
        owner=User.builder().id(1L).username("review-owner").fullName("Khách kiểm thử").role(Role.ROLE_USER).build();
        product=Product.builder().id(11L).name("Giày Yonex kiểm thử").sku("HG-SHOE-REVIEW")
                .brand("Yonex").price(new BigDecimal("100000")).stock(20).build();
        order=Order.builder().id(21L).user(owner).status(OrderStatus.COMPLETED).paymentMethod("COD")
                .cashCollectedAt(LocalDateTime.now()).totalAmount(product.getPrice()).build();
        item=OrderItem.builder().id(31L).order(order).product(product).quantity(1).price(product.getPrice())
                .selectedSize("40").selectedColor("Trắng").build();item.captureProduct();order.getItems().add(item);
        configureRepositories();
    }

    private void configureRepositories() {
        when(users.findByIdForUpdate(1L)).thenReturn(Optional.of(owner));
        when(products.findById(11L)).thenReturn(Optional.of(product));
        when(products.findByIdForUpdate(11L)).thenReturn(Optional.of(product));
        when(orders.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(order));
        when(orders.findRecognizedPaymentOrders()).thenReturn(List.of(order));
        when(reviews.countUserProductReviews(1L,11L)).thenAnswer(call->(long)saved.size());
        when(reviews.findByUserIdOrderByCreatedAtDesc(1L)).thenAnswer(call->List.copyOf(saved));
        when(reviews.findByProductIdOrderByCreatedAtDesc(11L)).thenAnswer(call->List.copyOf(saved));
        when(reviews.findAll()).thenAnswer(call->List.copyOf(saved));
        when(reviews.findByIdForUpdate(anyLong())).thenAnswer(call->saved.stream()
                .filter(review->Objects.equals(review.getId(),call.getArgument(0))).findFirst());
        when(reviews.saveAndFlush(any())).thenAnswer(call->{
            Review review=call.getArgument(0);
            if (review.getId()==null) {review.setId(100L+saved.size());review.setCreatedAt(LocalDateTime.now());saved.add(review);}
            return review;
        });
    }

    private ReviewRequest body() { return new ReviewRequest(11L,4,"<b>Giày rất vừa chân</b>",31L); }
    private ReviewResponse create() { return service.addReview(1L,body()); }

    @Test void paidCompletedPurchaseCreatesVerifiedSnapshotWithoutAwardingPoints() {
        var result=create();
        assertTrue(result.getVerifiedPurchase());assertTrue(result.getVisible());assertEquals(4,result.getRating());
        assertEquals(21L,result.getOrderId());assertEquals(31L,result.getOrderItemId());
        assertEquals("HG-SHOE-REVIEW",result.getProductSku());assertEquals("40 / Trắng",result.getPurchasedSpec());
        assertEquals("Giày rất vừa chân",result.getComment());assertNull(result.getOfficialReply());
        verify(users).findByIdForUpdate(1L);verify(users,never()).save(any());
        verify(products).findByIdForUpdate(11L);
        assertNull(order.getCompletedAt());
    }

    @Test void rejectsUnpaidAndIncompleteOrdersWithoutSaving() {
        when(orders.findRecognizedPaymentOrders()).thenReturn(List.of());
        assertThrows(BadRequestException.class,this::create);
        when(orders.findRecognizedPaymentOrders()).thenReturn(List.of(order));
        for (OrderStatus status:List.of(OrderStatus.PENDING,OrderStatus.PAID,OrderStatus.SHIPPING,OrderStatus.CANCELLED)) {
            order.setStatus(status);assertThrows(BadRequestException.class,this::create);
        }
        verify(reviews,never()).saveAndFlush(any());
    }

    @Test void rejectsOtherOwnerLineAndProductMismatch() {
        var request=body();request.setOrderItemId(999L);
        assertThrows(BadRequestException.class,()->service.addReview(1L,request));
        item.setProductIdSnapshot(12L);assertThrows(BadRequestException.class,this::create);
        item.setProductIdSnapshot(11L);order.setUser(User.builder().id(2L).build());
        assertThrows(BadRequestException.class,this::create);verify(reviews,never()).saveAndFlush(any());
    }

    @Test void duplicateHiddenOrDeletedSnapshotStillConflictsAndHistoryIsPreserved() {
        var first=create();service.deleteReview(first.getId());
        saved.get(0).setProduct(null);
        var failure=assertThrows(ResponseStatusException.class,this::create);
        assertEquals(HttpStatus.CONFLICT,failure.getStatusCode());assertEquals(1,saved.size());
        assertFalse(saved.get(0).getVisible());verify(reviews,never()).deleteById(any());
        assertTrue(service.getUserReviews(1L).get(0).getProductDeleted());
        assertEquals("Giày Yonex kiểm thử",service.getUserReviews(1L).get(0).getProductName());
        assertTrue(service.getEligibleProducts(1L).isEmpty());
    }

    @Test void hiddenAndUnsupportedProductsDoNotExposePublicReviewsOrEligibility() {
        product.setCatalogVisible(false);
        assertThrows(ResourceNotFoundException.class,()->service.getReviewsByProduct(11L));
        assertThrows(ResourceNotFoundException.class,this::create);assertTrue(service.getEligibleProducts(1L).isEmpty());
        product.setCatalogVisible(true);product.setBrand("Kumpoo");
        assertThrows(ResourceNotFoundException.class,()->service.getReviewsByProduct(11L));
        assertTrue(service.getEligibleProducts(1L).isEmpty());
    }

    @Test void eligibleListUsesNewestActualLineOnceAndExcludesReviewedProducts() {
        var eligible=service.getEligibleProducts(1L);
        assertEquals(1,eligible.size());assertEquals(31L,eligible.get(0).orderItemId());
        assertNull(eligible.get(0).productImageUrl());assertEquals("40",eligible.get(0).selectedSize());
        create();assertTrue(service.getEligibleProducts(1L).isEmpty());
    }

    @Test void moderationChangesOnlyVisibilityAndPublicRatingUsesVisibleRecords() {
        var first=create();
        saved.add(Review.builder().id(101L).user(owner).product(product).rating(2).comment("Chưa xác minh").build());
        assertEquals(3.0,service.getAverageRating(11L));assertEquals(2,service.getReviewCount(11L));
        service.updateVisibility(first.getId(),false);
        assertEquals(2.0,service.getAverageRating(11L));assertEquals(1,service.getReviewsByProduct(11L).size());
        assertFalse(service.getReviewsByProduct(11L).get(0).getVerifiedPurchase());
        assertEquals(2,service.getAllReviews().size());
        service.updateVisibility(first.getId(),true);assertEquals(3.0,service.getAverageRating(11L));
    }

    @Test void repliesSanitizeClearAndDoNotResetVisibilityOrPurchase() {
        Long id=create().getId();service.updateVisibility(id,false);
        var result=service.updateReply(id,"<script>alert(1)</script><b>Cửa hàng đã hỗ trợ</b>");
        assertEquals("Cửa hàng đã hỗ trợ",result.getOfficialReply());assertNotNull(result.getReplyUpdatedAt());
        assertFalse(result.getVisible());assertTrue(result.getVerifiedPurchase());
        result=service.updateReply(id,null);assertNull(result.getOfficialReply());assertNull(result.getReplyUpdatedAt());
        assertThrows(BadRequestException.class,()->service.updateReply(id,"x".repeat(2001)));
        assertThrows(BadRequestException.class,()->service.updateVisibility(id,null));
    }

    @Test void lostPaymentProofRemovesBadgeButRetainsVerifiedHistoryAndComment() {
        create();when(orders.findRecognizedPaymentOrders()).thenReturn(List.of());
        clearInvocations(orders);
        var own=service.getUserReviews(1L).get(0);
        assertFalse(own.getVerifiedPurchase());assertEquals("Giày rất vừa chân",own.getComment());
        assertTrue(saved.get(0).getVerifiedPurchase());assertEquals(1,saved.size());
        verify(orders,times(1)).findRecognizedPaymentOrders();
        assertFalse(service.getAllReviews().get(0).getVerifiedPurchase());
    }

    @Test void invalidRatingIdentifiersAndBlankSanitizedCommentNeverSave() {
        for (int rating:new int[]{0,6}) {
            var request=body();request.setRating(rating);assertThrows(BadRequestException.class,()->service.addReview(1L,request));
        }
        var request=body();request.setComment("<script>alert(1)</script>");
        assertThrows(BadRequestException.class,()->service.addReview(1L,request));
        request.setComment("x".repeat(2001));assertThrows(BadRequestException.class,()->service.addReview(1L,request));
        var invalid=body();invalid.setProductId(0L);
        assertThrows(BadRequestException.class,()->service.addReview(1L,invalid));
        verify(reviews,never()).saveAndFlush(any());
    }

    private AnnotationConfigWebApplicationContext webContext() {
        var web=new AnnotationConfigWebApplicationContext();web.setServletContext(new org.springframework.mock.web.MockServletContext());
        web.register(SecurityConfig.class,ReviewController.class,AdminReviewController.class,GlobalExceptionHandler.class,WebConfig.class);
        web.addBeanFactoryPostProcessor(factory->{
            factory.registerSingleton("reviewService",service);
            factory.registerSingleton("jwtAuthenticationFilter",new JwtAuthenticationFilter(mock(JwtTokenProvider.class),mock(UserDetailsServiceImpl.class)));
        });web.refresh();return web;
    }

    @Configuration @org.springframework.web.servlet.config.annotation.EnableWebMvc static class WebConfig {}

    @Test void httpRolesValidationCreationConflictAndModerationAreEnforced() throws Exception {
        try(var web=webContext()) {
            var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup(web).apply(springSecurity()).build();
            var customer=user(new CustomUserDetails(owner));
            var admin=user(new CustomUserDetails(User.builder().id(2L).username("admin").role(Role.ROLE_ADMIN).build()));
            mvc.perform(get("/api/reviews/eligible-products")).andExpect(status().isUnauthorized());
            mvc.perform(get("/api/reviews/product/11")).andExpect(status().isOk());
            mvc.perform(get("/api/admin/reviews").with(customer)).andExpect(status().isForbidden());
            mvc.perform(put("/api/admin/reviews/100/visibility").contentType("application/json").content("{\"visible\":false}"))
                    .andExpect(status().isUnauthorized());
            mvc.perform(put("/api/admin/reviews/100/reply").with(customer).contentType("application/json").content("{\"reply\":\"x\"}"))
                    .andExpect(status().isForbidden());
            mvc.perform(get("/api/reviews/eligible-products").with(customer)).andExpect(status().isOk()).andExpect(jsonPath("$[0].orderItemId").value(31));
            mvc.perform(post("/api/reviews").with(customer).contentType("application/json")
                    .content("{\"productId\":11,\"rating\":4,\"comment\":\"Rất vừa chân\",\"orderItemId\":31}"))
                    .andExpect(status().isCreated()).andExpect(jsonPath("$.verifiedPurchase").value(true));
            verifyModerationHttp(mvc,admin,customer);
        }
    }

    private void verifyModerationHttp(org.springframework.test.web.servlet.MockMvc mvc,
            org.springframework.test.web.servlet.request.RequestPostProcessor admin,
            org.springframework.test.web.servlet.request.RequestPostProcessor customer) throws Exception {
        mvc.perform(put("/api/admin/reviews/100/visibility").with(admin).contentType("application/json").content("{\"visible\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.visible").value(false));
        mvc.perform(put("/api/admin/reviews/100/visibility").with(admin).contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/admin/reviews/100/reply").with(admin).contentType("application/json").content("{\"reply\":\"Đã hỗ trợ\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.officialReply").value("Đã hỗ trợ"));
        mvc.perform(put("/api/admin/reviews/100/reply").with(admin).contentType("application/json").content("{\"reply\":null}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.officialReply").isEmpty());
        mvc.perform(delete("/api/admin/reviews/100").with(admin)).andExpect(status().isNoContent());
        mvc.perform(get("/api/reviews/product/11")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(post("/api/reviews").with(customer).contentType("application/json").content("{\"productId\":11,\"rating\":5,\"comment\":\"Lần hai\"}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/reviews").with(customer).contentType("application/json").content("{\"productId\":11,\"rating\":0,\"comment\":\"Lỗi\"}"))
                .andExpect(status().isBadRequest());
    }

    @Nested @org.junit.jupiter.api.condition.EnabledIfSystemProperty(named="review.workflow.mysql",matches="true")
    @TestInstance(TestInstance.Lifecycle.PER_CLASS)
    class MysqlWorkflow {
        private org.springframework.context.annotation.AnnotationConfigApplicationContext context;
        private org.springframework.transaction.support.TransactionTemplate tx;
        private ReviewService workflow;
        @BeforeAll void start() {
            context=new org.springframework.context.annotation.AnnotationConfigApplicationContext(MysqlConfig.class);
            tx=new org.springframework.transaction.support.TransactionTemplate(context.getBean(org.springframework.transaction.PlatformTransactionManager.class));
            workflow=context.getBean("verifiedReviewService",ReviewService.class);
        }
        @AfterAll void close() {if(context!=null)context.close();}

        @Test void concurrentDuplicateIsOneRecordAndHiddenHistoryStillBlocksRetry() throws Exception {
            Fixture fixture=fixture();var pool=java.util.concurrent.Executors.newFixedThreadPool(2);
            var ready=new java.util.concurrent.CountDownLatch(2);var start=new java.util.concurrent.CountDownLatch(1);
            try {
                var first=pool.submit(()->createConcurrent(fixture,ready,start));var second=pool.submit(()->createConcurrent(fixture,ready,start));
                assertTrue(ready.await(30,java.util.concurrent.TimeUnit.SECONDS));start.countDown();
                var responses=List.of(first.get(120,java.util.concurrent.TimeUnit.SECONDS),second.get(120,java.util.concurrent.TimeUnit.SECONDS));
                assertEquals(1,responses.stream().filter(value->value instanceof ReviewResponse).count(),responses::toString);
                assertEquals(1,responses.stream().filter(value->value instanceof ResponseStatusException failure
                        && failure.getStatusCode()==HttpStatus.CONFLICT).count(),responses::toString);
                var created=(ReviewResponse)responses.stream().filter(value->value instanceof ReviewResponse).findFirst().orElseThrow();
                workflow.deleteReview(created.getId());
                long savedCount=tx.execute(status->context.getBean(ReviewRepository.class).countUserProductReviews(fixture.userId(),fixture.productId()));
                assertEquals(1L,savedCount);
                assertEquals(HttpStatus.CONFLICT,assertThrows(ResponseStatusException.class,()->workflow.addReview(fixture.userId(),request(fixture))).getStatusCode());
                assertTrue(workflow.getReviewsByProduct(fixture.productId()).isEmpty());
                var own=workflow.getUserReviews(fixture.userId()).get(0);
                assertFalse(own.getVisible());assertTrue(own.getVerifiedPurchase());assertEquals("40",own.getSelectedSize());
            } finally {start.countDown();pool.shutdown();}
        }

        private Object createConcurrent(Fixture fixture,java.util.concurrent.CountDownLatch ready,
                java.util.concurrent.CountDownLatch start) throws InterruptedException {
            ready.countDown();start.await();
            try{return workflow.addReview(fixture.userId(),request(fixture));}catch(Exception failure){return failure;}
        }

        @Test void mockPaymentsAndRealPayosWithIdentityConflictNeverGrantReviewEligibility() {
            Fixture fixture=fixture();
            Long attemptId=tx.execute(status->{
                Order order=context.getBean(OrderRepository.class).findById(fixtureOrderId(fixture)).orElseThrow();
                order.setPaymentMethod("PAYOS_VIETQR");
                PaymentAttempt attempt=new PaymentAttempt();attempt.setOrder(order);attempt.setProvider("MOCK");
                attempt.setOrderCode(3000000000L+order.getId());attempt.setIdempotencyKey(UUID.randomUUID().toString());
                attempt.setAmount(order.getTotalAmount());attempt.setPaidAt(LocalDateTime.now());attempt.setStatus(PaymentAttempt.Status.PAID);
                return context.getBean(PaymentAttemptRepository.class).saveAndFlush(attempt).getId();
            });
            assertTrue(workflow.getEligibleProducts(fixture.userId()).isEmpty());
            assertThrows(BadRequestException.class,()->workflow.addReview(fixture.userId(),request(fixture)));
            tx.executeWithoutResult(status->context.getBean(PaymentAttemptRepository.class).findById(attemptId).orElseThrow().setProvider("PAYOS"));
            assertEquals(1,workflow.getEligibleProducts(fixture.userId()).size());
            addIdentityConflict(attemptId);
            assertTrue(workflow.getEligibleProducts(fixture.userId()).isEmpty());
            assertThrows(BadRequestException.class,()->workflow.addReview(fixture.userId(),request(fixture)));
        }

        @Test void detachedProductHistoryStillCountsForDuplicateAndPreservesPurchasedSnapshot() {
            Fixture fixture=fixture();var created=workflow.addReview(fixture.userId(),request(fixture));
            tx.executeWithoutResult(status->{
                var review=context.getBean(ReviewRepository.class).findById(created.getId()).orElseThrow();
                review.setProduct(null);review.setVisible(false);
            });
            long count=tx.execute(status->context.getBean(ReviewRepository.class).countUserProductReviews(fixture.userId(),fixture.productId()));
            assertEquals(1L,count);
            assertEquals(HttpStatus.CONFLICT,assertThrows(ResponseStatusException.class,()->workflow.addReview(fixture.userId(),request(fixture))).getStatusCode());
            var own=workflow.getUserReviews(fixture.userId()).get(0);
            assertTrue(own.getProductDeleted());assertEquals(created.getProductSku(),own.getProductSku());
            assertEquals("40",own.getSelectedSize());assertEquals(created.getOrderItemId(),own.getOrderItemId());
        }

        @Test void productHiddenUnderParentLockPreventsConcurrentReviewCreation() throws Exception {
            Fixture fixture=fixture();var pool=java.util.concurrent.Executors.newFixedThreadPool(2);
            var parentLocked=new java.util.concurrent.CountDownLatch(1);var commitAllowed=new java.util.concurrent.CountDownLatch(1);
            var reviewStarted=new java.util.concurrent.CountDownLatch(1);
            try {
                var hide=pool.submit(()->tx.executeWithoutResult(status->{
                    var product=context.getBean(ProductRepository.class).findByIdForUpdate(fixture.productId()).orElseThrow();
                    parentLocked.countDown();awaitGate(commitAllowed);product.setCatalogVisible(false);
                }));
                assertTrue(parentLocked.await(30,java.util.concurrent.TimeUnit.SECONDS));
                var create=pool.submit(()->{reviewStarted.countDown();
                    try{return workflow.addReview(fixture.userId(),request(fixture));}catch(Exception failure){return failure;}
                });
                assertTrue(reviewStarted.await(30,java.util.concurrent.TimeUnit.SECONDS));
                assertThrows(java.util.concurrent.TimeoutException.class,()->create.get(2,java.util.concurrent.TimeUnit.SECONDS));
                commitAllowed.countDown();hide.get(120,java.util.concurrent.TimeUnit.SECONDS);
                assertInstanceOf(ResourceNotFoundException.class,create.get(120,java.util.concurrent.TimeUnit.SECONDS));
                long count=tx.execute(status->context.getBean(ReviewRepository.class).countUserProductReviews(fixture.userId(),fixture.productId()));
                assertEquals(0L,count);assertTrue(workflow.getUserReviews(fixture.userId()).isEmpty());
            } finally {commitAllowed.countDown();pool.shutdown();}
        }

        private void awaitGate(java.util.concurrent.CountDownLatch gate) {
            try {assertTrue(gate.await(30,java.util.concurrent.TimeUnit.SECONDS));}
            catch(InterruptedException interrupted) {Thread.currentThread().interrupt();throw new IllegalStateException(interrupted);}
        }

        private Long fixtureOrderId(Fixture fixture) {
            return context.getBean(OrderRepository.class).findByUserIdOrderByCreatedAtDesc(fixture.userId()).get(0).getId();
        }

        private void addIdentityConflict(Long attemptId) {
            tx.executeWithoutResult(status->{
                var attempt=context.getBean(PaymentAttemptRepository.class).findById(attemptId).orElseThrow();
                String key=UUID.randomUUID().toString();PaymentEvent event=new PaymentEvent();
                event.setProvider("PAYOS");event.setPaymentAttempt(attempt);event.setOrder(attempt.getOrder());
                event.setPaymentLinkId("review-test-"+key);event.setReference(key);event.setOrderCode(attempt.getOrderCode());
                event.setAmount(attempt.getAmount());event.setCurrency("VND");event.setTransactionDateTime(LocalDateTime.now().toString());
                event.setReceivedAt(LocalDateTime.now());event.setVerifiedAt(LocalDateTime.now());event.setSource(PaymentEvent.Source.WEBHOOK);
                event.setProcessingResult("NEEDS_REVIEW");event.setReviewReason("IDENTITY_MISMATCH");
                event.setFingerprint(key.replace("-","").repeat(2));event.setReceivedPayment(true);
                context.getBean(PaymentEventRepository.class).saveAndFlush(event);
            });
        }

        @Test void codWithAmbiguousPayosAttemptNeverGrantsReviewEligibility() {
            Fixture fixture=fixture();
            tx.executeWithoutResult(status->{
                var order=context.getBean(OrderRepository.class).findById(fixtureOrderId(fixture)).orElseThrow();
                PaymentAttempt attempt=new PaymentAttempt();attempt.setOrder(order);attempt.setProvider("PAYOS");
                attempt.setOrderCode(4000000000L+order.getId());attempt.setIdempotencyKey(UUID.randomUUID().toString());
                attempt.setAmount(order.getTotalAmount());attempt.setStatus(PaymentAttempt.Status.NEEDS_REVIEW);
                context.getBean(PaymentAttemptRepository.class).saveAndFlush(attempt);
            });
            assertTrue(workflow.getEligibleProducts(fixture.userId()).isEmpty());
            assertThrows(BadRequestException.class,()->workflow.addReview(fixture.userId(),request(fixture)));
        }

        @Test void paidReviewWithLaterHardConflictLosesPublicBadgeWithoutLosingHistory() {
            Fixture fixture=fixture();
            Long attemptId=tx.execute(status->{
                var order=context.getBean(OrderRepository.class).findById(fixtureOrderId(fixture)).orElseThrow();
                order.setPaymentMethod("PAYOS_VIETQR");PaymentAttempt attempt=new PaymentAttempt();attempt.setOrder(order);
                attempt.setProvider("PAYOS");attempt.setOrderCode(5000000000L+order.getId());
                attempt.setIdempotencyKey(UUID.randomUUID().toString());attempt.setAmount(order.getTotalAmount());
                attempt.setStatus(PaymentAttempt.Status.PAID);attempt.setPaidAt(LocalDateTime.now());
                return context.getBean(PaymentAttemptRepository.class).saveAndFlush(attempt).getId();
            });
            var created=workflow.addReview(fixture.userId(),request(fixture));assertTrue(created.getVerifiedPurchase());
            addIdentityConflict(attemptId);
            var publicReview=workflow.getReviewsByProduct(fixture.productId()).get(0);
            assertFalse(publicReview.getVerifiedPurchase());assertEquals(created.getComment(),publicReview.getComment());
            boolean historicalFlag=tx.execute(status->context.getBean(ReviewRepository.class).findById(created.getId()).orElseThrow().getVerifiedPurchase());
            assertTrue(historicalFlag);assertEquals(1,workflow.getUserReviews(fixture.userId()).size());
        }

        private ReviewRequest request(Fixture fixture){return new ReviewRequest(fixture.productId(),4,"Đánh giá kiểm thử",fixture.itemId());}
        private Fixture fixture() {
            return tx.execute(status->{
                String key=UUID.randomUUID().toString().replace("-","");
                User user=context.getBean(UserRepository.class).saveAndFlush(User.builder().username("rev"+key)
                        .email(key+"@example.invalid").password("fixture-not-for-login").fullName("Đánh giá kiểm thử").build());
                Product product=context.getBean(ProductRepository.class).saveAndFlush(Product.builder().name("Giày kiểm thử "+key)
                        .sku("HG-REV-"+key).brand("Yonex").stock(20).price(new BigDecimal("100000"))
                        .category(context.getBean(CategoryRepository.class).findById(2L).orElseThrow()).build());
                Order order=Order.builder().user(user).paymentMethod("COD").status(OrderStatus.COMPLETED)
                        .cashCollectedAt(LocalDateTime.now()).totalAmount(product.getPrice()).build();
                OrderItem item=OrderItem.builder().order(order).product(product).quantity(1).price(product.getPrice()).selectedSize("40").build();
                order.getItems().add(item);context.getBean(OrderRepository.class).saveAndFlush(order);
                return new Fixture(user.getId(),product.getId(),item.getId());
            });
        }
        private record Fixture(Long userId,Long productId,Long itemId) {}
    }

    @Configuration @org.springframework.context.annotation.Import(ProductCatalogIntegrationTest.Config.class)
    @org.springframework.transaction.annotation.EnableTransactionManagement
    static class MysqlConfig {
        @org.springframework.context.annotation.Primary
        @org.springframework.context.annotation.Bean("verifiedReviewService") ReviewService verifiedReviewService(
                ReviewRepository reviews,ProductRepository products,UserRepository users,OrderRepository orders) {
            return new ReviewService(reviews,products,users,orders);
        }
    }
}
