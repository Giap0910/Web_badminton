package com.sports.service;

import com.sports.dto.ReviewRequest;
import com.sports.dto.ReviewResponse;
import com.sports.entity.*;
import com.sports.exception.BadRequestException;
import com.sports.exception.ResourceNotFoundException;
import com.sports.repository.ProductRepository;
import com.sports.repository.ReviewRepository;
import com.sports.repository.UserRepository;
import com.sports.repository.OrderRepository;
import com.sports.security.HtmlSanitizerUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.time.LocalDateTime;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;

    public record EligibleProduct(Long productId, String productName, String productSku, String productBrand,
            String productImageUrl, Long orderId, Long orderItemId, String selectedSize, String selectedColor,
            String selectedWeight, String purchasedSpec) {}

    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviewsByProduct(Long productId) {
        requirePublicProduct(productId);
        Map<Long, Order> paidCompleted = paidCompletedOrders();
        return visibleReviews(productId).stream().map(review -> toDto(review, paidCompleted)).toList();
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public ReviewResponse addReview(Long userId, ReviewRequest request) {
        validateRequest(request);
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + userId));
        Product product = requirePublicProductForUpdate(request.getProductId());
        if (reviewRepository.countUserProductReviews(userId, product.getId()) > 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bạn đã đánh giá sản phẩm này");
        OrderItem purchased = purchasedItems(userId).stream()
                .filter(item -> Objects.equals(productId(item), product.getId()))
                .filter(item -> request.getOrderItemId() == null || Objects.equals(item.getId(), request.getOrderItemId()))
                .findFirst().orElseThrow(() -> new BadRequestException("Chỉ được đánh giá sản phẩm đã thanh toán và hoàn tất đơn hàng"));
        String cleanComment = HtmlSanitizerUtil.sanitizeToPlainText(request.getComment());
        if (cleanComment == null || cleanComment.isBlank()) throw new BadRequestException("Bình luận không được để trống");
        Review review = Review.builder().user(user).product(product).rating(request.getRating()).comment(cleanComment)
                .verifiedPurchase(true).build();
        capturePurchase(review, purchased);
        return toDto(reviewRepository.saveAndFlush(review));
    }

    @Transactional(readOnly = true)
    public Double getAverageRating(Long productId) {
        return visibleReviews(productId).stream().filter(this::validRating).mapToInt(Review::getRating).average().orElse(0.0);
    }

    @Transactional(readOnly = true)
    public int getReviewCount(Long productId) {
        return visibleReviews(productId).size();
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getUserReviews(Long userId) {
        Map<Long, Order> paidCompleted = paidCompletedOrders();
        return reviewRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(review -> toDto(review, paidCompleted))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> getAllReviews() {
        Map<Long, Order> paidCompleted = paidCompletedOrders();
        return reviewRepository.findAll().stream()
                .sorted(Comparator.comparing(Review::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(review -> toDto(review, paidCompleted))
                .toList();
    }

    @Transactional
    public void deleteReview(Long id) {
        updateVisibility(id, false);
    }

    @Transactional
    public ReviewResponse updateVisibility(Long id, Boolean visible) {
        if (visible == null) throw new BadRequestException("Trạng thái hiển thị không được để trống");
        Review review = lockedReview(id);review.setVisible(visible);
        return toDto(reviewRepository.saveAndFlush(review));
    }

    @Transactional
    public ReviewResponse updateReply(Long id, String reply) {
        if (reply != null && reply.length() > 2000) throw new BadRequestException("Phản hồi tối đa 2000 ký tự");
        String clean = HtmlSanitizerUtil.sanitizeToPlainText(reply);
        Review review = lockedReview(id);
        review.setOfficialReply(clean == null || clean.isBlank() ? null : clean);
        review.setReplyUpdatedAt(review.getOfficialReply() == null ? null : LocalDateTime.now());
        return toDto(reviewRepository.saveAndFlush(review));
    }

    @Transactional(readOnly = true)
    public List<EligibleProduct> getEligibleProducts(Long userId) {
        Set<Long> reviewed = new HashSet<>();
        reviewRepository.findByUserIdOrderByCreatedAtDesc(userId).forEach(review -> reviewed.add(reviewProductId(review)));
        Map<Long, EligibleProduct> eligible = new LinkedHashMap<>();
        for (OrderItem item : purchasedItems(userId)) {
            Product product = item.getProduct();Long id = productId(item);
            if (!isPublicProduct(product) || reviewed.contains(id)) continue;
            eligible.putIfAbsent(id, new EligibleProduct(id, productName(item), productSku(item), productBrand(item),
                    null, item.getOrder().getId(), item.getId(), item.getSelectedSize(), item.getSelectedColor(),
                    item.getSelectedWeight(), purchasedSpec(item.getSelectedSize(), item.getSelectedColor(), item.getSelectedWeight())));
        }
        return List.copyOf(eligible.values());
    }

    private List<OrderItem> purchasedItems(Long userId) {
        Set<Long> paid = new HashSet<>();
        orderRepository.findRecognizedPaymentOrders().forEach(order -> paid.add(order.getId()));
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(order -> order.getUser() != null && Objects.equals(order.getUser().getId(), userId))
                .filter(order -> order.getStatus() == OrderStatus.COMPLETED && paid.contains(order.getId()))
                .flatMap(order -> order.getItems().stream()).filter(item -> item.getQuantity() != null && item.getQuantity() > 0).toList();
    }

    private void validateRequest(ReviewRequest request) {
        if (request == null || request.getProductId() == null || request.getProductId() < 1
                || request.getRating() == null || request.getRating() < 1 || request.getRating() > 5
                || request.getComment() == null || request.getComment().isBlank() || request.getComment().length() > 2000
                || request.getOrderItemId() != null && request.getOrderItemId() < 1)
            throw new BadRequestException("Thông tin đánh giá không hợp lệ");
    }

    private Product requirePublicProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm"));
        if (!isPublicProduct(product)) throw new ResourceNotFoundException("Không tìm thấy sản phẩm");
        return product;
    }

    private Product requirePublicProductForUpdate(Long id) {
        Product product = productRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm"));
        if (!isPublicProduct(product)) throw new ResourceNotFoundException("Không tìm thấy sản phẩm");
        return product;
    }

    private boolean isPublicProduct(Product product) {
        return product != null && Boolean.TRUE.equals(product.getCatalogVisible()) && ProductBrand.isSupported(product.getBrand());
    }

    private List<Review> visibleReviews(Long productId) {
        return reviewRepository.findByProductIdOrderByCreatedAtDesc(productId).stream()
                .filter(review -> Boolean.TRUE.equals(review.getVisible())).toList();
    }

    private boolean validRating(Review review) { return review.getRating() != null && review.getRating() >= 1 && review.getRating() <= 5; }
    private Review lockedReview(Long id) {
        return reviewRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đánh giá"));
    }

    private Long productId(OrderItem item) { return item.getProductIdSnapshot() != null ? item.getProductIdSnapshot() : item.getProduct() == null ? null : item.getProduct().getId(); }
    private String productName(OrderItem item) { return item.getProductNameSnapshot() != null ? item.getProductNameSnapshot() : item.getProduct().getName(); }
    private String productSku(OrderItem item) { return item.getProductSkuSnapshot() != null ? item.getProductSkuSnapshot() : item.getProduct().getSku(); }
    private String productBrand(OrderItem item) { return item.getProductBrandSnapshot() != null ? item.getProductBrandSnapshot() : item.getProduct().getBrand(); }
    private Long reviewProductId(Review review) { return review.getProductIdSnapshot() != null ? review.getProductIdSnapshot() : review.getProduct() == null ? null : review.getProduct().getId(); }

    private void capturePurchase(Review review, OrderItem item) {
        review.setProductIdSnapshot(productId(item));review.setProductNameSnapshot(productName(item));
        review.setProductSkuSnapshot(productSku(item));review.setProductBrandSnapshot(productBrand(item));
        review.setOrderIdSnapshot(item.getOrder().getId());review.setOrderItemIdSnapshot(item.getId());
        review.setSelectedSizeSnapshot(item.getSelectedSize());review.setSelectedColorSnapshot(item.getSelectedColor());
        review.setSelectedWeightSnapshot(item.getSelectedWeight());
    }

    private String purchasedSpec(String size, String color, String weight) {
        return java.util.stream.Stream.of(size, color, weight).filter(value -> value != null && !value.isBlank())
                .collect(java.util.stream.Collectors.joining(" / "));
    }

    private ReviewResponse.ReviewResponseBuilder productMetadata(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .productId(reviewProductId(review))
                .productName(review.getProductNameSnapshot()!=null ? review.getProductNameSnapshot() : review.getProduct()!=null ? review.getProduct().getName() : "Sản phẩm đã ngừng bán")
                .productDeleted(review.getProduct()==null)
                .productImageUrl(null)
                .productBrand(review.getProductBrandSnapshot()!=null ? review.getProductBrandSnapshot() : review.getProduct()!=null ? review.getProduct().getBrand() : "")
                .productSku(review.getProductSkuSnapshot() != null ? review.getProductSkuSnapshot() : review.getProduct() == null ? null : review.getProduct().getSku());
    }

    private Map<Long, Order> paidCompletedOrders() {
        Map<Long, Order> paid = new HashMap<>();
        orderRepository.findRecognizedPaymentOrders().stream().filter(order -> order.getStatus() == OrderStatus.COMPLETED)
                .forEach(order -> paid.put(order.getId(), order));
        return paid;
    }

    private boolean currentlyVerified(Review review, Map<Long, Order> paidCompleted) {
        if (!Boolean.TRUE.equals(review.getVerifiedPurchase()) || review.getOrderItemIdSnapshot() == null) return false;
        Order order = paidCompleted.get(review.getOrderIdSnapshot());
        if (order == null || order.getUser() == null || !Objects.equals(order.getUser().getId(), review.getUser().getId())) return false;
        return order.getItems().stream().anyMatch(item -> Objects.equals(item.getId(), review.getOrderItemIdSnapshot())
                && Objects.equals(productId(item), reviewProductId(review)));
    }

    private ReviewResponse toDto(Review review) { return toDto(review, paidCompletedOrders()); }

    private ReviewResponse toDto(Review review, Map<Long, Order> paidCompleted) {
        return productMetadata(review)
                .userId(review.getUser().getId())
                .username(review.getUser().getUsername())
                .userFullName(review.getUser().getFullName())
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .orderId(review.getOrderIdSnapshot()).orderItemId(review.getOrderItemIdSnapshot())
                .selectedSize(review.getSelectedSizeSnapshot()).selectedColor(review.getSelectedColorSnapshot())
                .selectedWeight(review.getSelectedWeightSnapshot())
                .purchasedSpec(purchasedSpec(review.getSelectedSizeSnapshot(), review.getSelectedColorSnapshot(), review.getSelectedWeightSnapshot()))
                .visible(Boolean.TRUE.equals(review.getVisible())).verifiedPurchase(currentlyVerified(review, paidCompleted))
                .officialReply(review.getOfficialReply()).replyUpdatedAt(review.getReplyUpdatedAt())
                .build();
    }
}
