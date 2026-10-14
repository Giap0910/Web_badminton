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

    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public UserProfileResponse updateUserProfile(Long userId, UserProfileUpdateRequest request) {
        User user=lockedUser(userId);

        if (request.getFullName() != null) {
            if (request.getFullName().isBlank()) throw new BadRequestException("Họ tên không được để trống");
            user.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }
        if (request.isDobProvided()) user.setDob(request.getDob());
        if (request.isGenderProvided() || request.getGender()!=null) {
            if (request.getGender()!=null && !java.util.Set.of("nam","nu","khac").contains(request.getGender()))
                throw new BadRequestException("Giới tính không hợp lệ");
            user.setGender(request.getGender());
        }
        if (request.getAddress() != null) {
            user.setAddress(request.getAddress().trim());
        }

        userRepository.save(user);
        return getUserProfile(userId);
    }

    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void changePassword(Long userId, ChangePasswordRequest request) {
        AuthService.validateNewPassword(request.getNewPassword());
        User user=lockedUser(userId);

        if (!matchesCurrentPassword(request.getCurrentPassword(),user.getPassword())) {
            throw new BadRequestException("Mật khẩu hiện tại không chính xác!");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        revokeSessions(user);
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

    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public UserProfileResponse updateUserStatus(Long userId, boolean active) {
        var admins=userRepository.findAllAdminsForUpdate();
        User user=lockedUser(userId);
        boolean wasActive=!Boolean.FALSE.equals(user.getIsActive());
        if (!active && wasActive && user.getRole()==com.sports.entity.Role.ROLE_ADMIN
                && admins.stream().filter(admin -> !Boolean.FALSE.equals(admin.getIsActive())).count()<2)
            throw new BadRequestException("Không thể khóa quản trị viên đang hoạt động cuối cùng");
        if (wasActive!=active) revokeSessions(user);
        user.setIsActive(active);
        return toProfileResponse(userRepository.save(user));
    }

    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public UserProfileResponse uploadAvatar(Long userId, org.springframework.web.multipart.MultipartFile file) {
        User user=lockedUser(userId);
        user.setAvatarKey(avatarStorage.store(file));
        userRepository.save(user);
        return getUserProfile(userId);
    }
    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public UserProfileResponse deleteAvatar(Long userId) {
        User user=lockedUser(userId);
        user.setAvatarKey(null);
        userRepository.save(user);
        return getUserProfile(userId);
    }

    private User lockedUser(Long userId) {
        return userRepository.findByIdForUpdate(userId).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy người dùng"));
    }

    private void revokeSessions(User user) {
        user.setTokenVersion(Math.addExact(user.getTokenVersion()==null ? 0L : user.getTokenVersion(),1L));
    }

    private boolean matchesCurrentPassword(String supplied,String stored) {
        if (supplied==null || supplied.isBlank()) return false;
        try { return passwordEncoder.matches(supplied,stored); }
        catch(IllegalArgumentException invalid) { return false; }
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
                .gender(user.getGender())
                .avatarUrl(user.getAvatarKey() == null ? null : "/api/media/avatars/" + user.getAvatarKey())
                .role(user.getRole().name())
                .isActive(user.getIsActive() != null ? user.getIsActive() : true)
                .createdAt(user.getCreatedAt())
                .build();
    }
}
