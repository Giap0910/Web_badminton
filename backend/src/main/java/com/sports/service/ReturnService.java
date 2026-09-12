package com.sports.service;

import com.sports.dto.ReturnCreateRequest;
import com.sports.dto.ReturnResponse;
import com.sports.entity.Order;
import com.sports.entity.ReturnRequest;
import com.sports.entity.ReturnStatus;
import com.sports.entity.User;
import com.sports.exception.BadRequestException;
import com.sports.exception.ResourceNotFoundException;
import com.sports.exception.UnauthorizedException;
import com.sports.repository.OrderRepository;
import com.sports.repository.ReturnRequestRepository;
import com.sports.repository.UserRepository;
import com.sports.security.HtmlSanitizerUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReturnService {

    private final ReturnRequestRepository returnRequestRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    @Transactional
    public ReturnResponse createReturnRequest(Long userId, ReturnCreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + userId));

        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + request.getOrderId()));

        // Anti-IDOR check
        if (!order.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("Bạn chỉ có thể gửi yêu cầu đổi trả cho đơn hàng của chính mình!");
        }

        String cleanReason = HtmlSanitizerUtil.sanitizeToPlainText(request.getReason());

        ReturnRequest returnReq = ReturnRequest.builder()
                .user(user)
                .order(order)
                .reason(cleanReason)
                .imageUrl(request.getImageUrl())
                .status(ReturnStatus.PENDING)
                .build();

        ReturnRequest saved = returnRequestRepository.save(returnReq);
        log.info("Khởi tạo yêu cầu đổi trả ID={} cho Đơn hàng ID={}, Khách hàng={}", saved.getId(), order.getId(), user.getUsername());
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<ReturnResponse> getUserReturnRequests(Long userId) {
        return returnRequestRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ReturnResponse> getAllReturnRequests() {
        return returnRequestRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ReturnResponse updateStatus(Long requestId, ReturnStatus newStatus, String adminNote) {
        ReturnRequest req = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu đổi trả với ID: " + requestId));
        req.setStatus(newStatus);
        if (adminNote != null) {
            req.setAdminNote(HtmlSanitizerUtil.sanitizeToPlainText(adminNote));
        }
        return toDto(returnRequestRepository.save(req));
    }

    private ReturnResponse toDto(ReturnRequest req) {
        return ReturnResponse.builder()
                .id(req.getId())
                .orderId(req.getOrder().getId())
                .userId(req.getUser().getId())
                .userFullName(req.getUser().getFullName())
                .reason(req.getReason())
                .imageUrl(req.getImageUrl())
                .status(req.getStatus().name())
                .adminNote(req.getAdminNote())
                .createdAt(req.getCreatedAt())
                .build();
    }
}
