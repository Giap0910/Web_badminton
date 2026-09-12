package com.sports.service;

import com.sports.dto.ShippingAddressDto;
import com.sports.entity.ShippingAddress;
import com.sports.entity.User;
import com.sports.exception.ResourceNotFoundException;
import com.sports.repository.ShippingAddressRepository;
import com.sports.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShippingAddressService {

    private final ShippingAddressRepository shippingAddressRepository;
    private final UserRepository userRepository;

    public List<ShippingAddressDto> getUserAddresses(Long userId) {
        return shippingAddressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public ShippingAddressDto getAddressById(Long id, Long userId) {
        ShippingAddress address = shippingAddressRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy địa chỉ giao hàng"));
        return toDto(address);
    }

    @Transactional
    public ShippingAddressDto createAddress(Long userId, ShippingAddressDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản người dùng"));

        List<ShippingAddress> existing = shippingAddressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
        boolean shouldBeDefault = Boolean.TRUE.equals(dto.getIsDefault()) || existing.isEmpty();

        if (shouldBeDefault) {
            shippingAddressRepository.resetDefaultAddressForUser(userId);
        }

        ShippingAddress address = ShippingAddress.builder()
                .user(user)
                .fullName(dto.getFullName())
                .phone(dto.getPhone())
                .address(dto.getAddress())
                .province(dto.getProvince())
                .isDefault(shouldBeDefault)
                .build();

        return toDto(shippingAddressRepository.save(address));
    }

    @Transactional
    public ShippingAddressDto updateAddress(Long id, Long userId, ShippingAddressDto dto) {
        ShippingAddress address = shippingAddressRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy địa chỉ giao hàng"));

        if (Boolean.TRUE.equals(dto.getIsDefault()) && !Boolean.TRUE.equals(address.getIsDefault())) {
            shippingAddressRepository.resetDefaultAddressForUser(userId);
            address.setIsDefault(true);
        }

        address.setFullName(dto.getFullName());
        address.setPhone(dto.getPhone());
        address.setAddress(dto.getAddress());
        address.setProvince(dto.getProvince());

        return toDto(shippingAddressRepository.save(address));
    }

    @Transactional
    public ShippingAddressDto setDefaultAddress(Long id, Long userId) {
        ShippingAddress address = shippingAddressRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy địa chỉ giao hàng"));

        shippingAddressRepository.resetDefaultAddressForUser(userId);
        address.setIsDefault(true);
        return toDto(shippingAddressRepository.save(address));
    }

    @Transactional
    public void deleteAddress(Long id, Long userId) {
        ShippingAddress address = shippingAddressRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy địa chỉ giao hàng"));

        boolean wasDefault = Boolean.TRUE.equals(address.getIsDefault());
        shippingAddressRepository.delete(address);

        // If default address was deleted, make the first remaining address default
        if (wasDefault) {
            List<ShippingAddress> remaining = shippingAddressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
            if (!remaining.isEmpty()) {
                ShippingAddress first = remaining.get(0);
                first.setIsDefault(true);
                shippingAddressRepository.save(first);
            }
        }
    }

    private ShippingAddressDto toDto(ShippingAddress address) {
        return ShippingAddressDto.builder()
                .id(address.getId())
                .fullName(address.getFullName())
                .phone(address.getPhone())
                .address(address.getAddress())
                .province(address.getProvince())
                .isDefault(address.getIsDefault())
                .createdAt(address.getCreatedAt())
                .build();
    }
}
