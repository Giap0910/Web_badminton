package com.sports.service;

import com.sports.dto.ChangePasswordRequest;
import com.sports.dto.UserProfileResponse;
import com.sports.dto.UserProfileUpdateRequest;
import com.sports.entity.User;
import com.sports.exception.BadRequestException;
import com.sports.exception.ResourceNotFoundException;
import com.sports.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.sports.repository.OrderRepository orderRepository;
    @org.springframework.beans.factory.annotation.Autowired
    private AvatarStorageService avatarStorage;

    @Transactional(readOnly = true)
    public UserProfileResponse getUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        var orders = orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        var paidIds = orderRepository.findRecognizedPaymentOrders().stream()
                .filter(order -> order.getUser().getId().equals(userId)).map(com.sports.entity.Order::getId)
                .collect(java.util.stream.Collectors.toSet());
        return customerProfile(user, orders, paidIds);
    }

    @Transactional
    public UserProfileResponse updateUserProfile(Long userId, UserProfileUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }
        if (request.isDobProvided()) user.setDob(request.getDob());
        if (request.getAddress() != null) {
            user.setAddress(request.getAddress().trim());
        }

        userRepository.save(user);
        return getUserProfile(userId);
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu hiện tại không chính xác!");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public java.util.List<UserProfileResponse> getAllUsers() {
        var orders = orderRepository.findAll();
        var paidIds = orderRepository.findRecognizedPaymentOrders().stream().map(com.sports.entity.Order::getId)
                .collect(java.util.stream.Collectors.toSet());
        return userRepository.findAll().stream()
                .map(user -> customerProfile(user, orders, paidIds))
                .collect(java.util.stream.Collectors.toList());
    }

    private UserProfileResponse customerProfile(User user, java.util.List<com.sports.entity.Order> orders, java.util.Set<Long> paidIds) {
        var profile = toProfileResponse(user);
        var customerOrders = orders.stream().filter(order -> order.getUser().getId().equals(user.getId())).toList();
        profile.setTotalOrders(customerOrders.size());
        profile.setTotalSpent(customerOrders.stream().filter(order -> paidIds.contains(order.getId()))
                .map(com.sports.entity.Order::getTotalAmount).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add));
        var netPaid = customerOrders.stream().filter(order -> paidIds.contains(order.getId()))
                .filter(order -> order.getStatus() != com.sports.entity.OrderStatus.CANCELLED)
                .map(order -> order.getTotalAmount().subtract(order.getShippingFee() == null
                        ? java.math.BigDecimal.ZERO : order.getShippingFee()).max(java.math.BigDecimal.ZERO))
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        profile.setPaidProductAmount(netPaid);
        profile.setLoyaltyPoints(LoyaltyPolicy.available(customerOrders,paidIds));
        return profile;
    }

    @Transactional
    public UserProfileResponse updateUserStatus(Long userId, boolean active) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + userId));
        user.setIsActive(active);
        return toProfileResponse(userRepository.save(user));
    }

    @Transactional
    public UserProfileResponse uploadAvatar(Long userId, org.springframework.web.multipart.MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        user.setAvatarKey(avatarStorage.store(file));
        userRepository.save(user);
        return getUserProfile(userId);
    }
    @Transactional
    public UserProfileResponse deleteAvatar(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        user.setAvatarKey(null);
        userRepository.save(user);
        return getUserProfile(userId);
    }

    private UserProfileResponse toProfileResponse(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .address(user.getAddress())
                .dob(user.getDob())
                .avatarUrl(user.getAvatarKey() == null ? null : "/api/media/avatars/" + user.getAvatarKey())
                .role(user.getRole().name())
                .isActive(user.getIsActive() != null ? user.getIsActive() : true)
                .createdAt(user.getCreatedAt())
                .build();
    }
}
