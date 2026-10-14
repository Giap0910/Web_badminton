package com.sports.service;

import com.sports.dto.ShippingAddressDto;
import com.sports.entity.ShippingAddress;
import com.sports.entity.User;
import com.sports.exception.BadRequestException;
import com.sports.exception.ResourceNotFoundException;
import com.sports.repository.ShippingAddressRepository;
import com.sports.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ShippingAddressService {
    private final ShippingAddressRepository shippingAddressRepository;
    private final UserRepository userRepository;
    @org.springframework.beans.factory.annotation.Autowired
    private AdministrativeUnitService administrativeUnits;

    @Transactional(readOnly=true)
    public List<ShippingAddressDto> getUserAddresses(Long userId) {
        return shippingAddressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly=true)
    public ShippingAddressDto getAddressById(Long id,Long userId) {
        return toDto(ownedAddress(id,userId));
    }

    @Transactional(isolation=Isolation.READ_COMMITTED)
    public ShippingAddressDto createAddress(Long userId,ShippingAddressDto dto) {
        User user=lockUser(userId);
        ShippingAddress address=ShippingAddress.builder().user(user).build();
        applyAddress(address,dto);
        List<ShippingAddress> existing=shippingAddressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
        ShippingAddress duplicate=existing.stream().filter(value->sameAddress(value,address,dto)).findFirst().orElse(null);
        if (duplicate!=null) {
            if (Boolean.TRUE.equals(dto.getIsDefault())) makeDefault(userId,duplicate);
            return toDto(duplicate);
        }
        boolean isDefault=Boolean.TRUE.equals(dto.getIsDefault()) || existing.isEmpty();
        if (isDefault) clearDefaults(existing);
        address.setIsDefault(isDefault);
        return toDto(shippingAddressRepository.saveAndFlush(address));
    }

    @Transactional(isolation=Isolation.READ_COMMITTED)
    public ShippingAddressDto updateAddress(Long id,Long userId,ShippingAddressDto dto) {
        lockUser(userId);
        ShippingAddress address=ownedAddress(id,userId);
        applyAddress(address,dto);
        if (Boolean.TRUE.equals(dto.getIsDefault())) makeDefault(userId,address);
        return toDto(shippingAddressRepository.saveAndFlush(address));
    }

    @Transactional(isolation=Isolation.READ_COMMITTED)
    public ShippingAddressDto setDefaultAddress(Long id,Long userId) {
        lockUser(userId);
        ShippingAddress address=ownedAddress(id,userId);
        makeDefault(userId,address);
        return toDto(address);
    }

    @Transactional(isolation=Isolation.READ_COMMITTED)
    public void deleteAddress(Long id,Long userId) {
        lockUser(userId);
        ShippingAddress address=ownedAddress(id,userId);
        boolean wasDefault=Boolean.TRUE.equals(address.getIsDefault());
        shippingAddressRepository.delete(address);
        shippingAddressRepository.flush();
        if (wasDefault) {
            List<ShippingAddress> remaining=shippingAddressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
            if (!remaining.isEmpty()) makeDefault(userId,remaining.get(0));
        }
    }

    private User lockUser(Long userId) {
        return userRepository.findByIdForUpdate(userId).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy tài khoản người dùng"));
    }

    private ShippingAddress ownedAddress(Long id,Long userId) {
        return shippingAddressRepository.findByIdAndUserId(id,userId)
                .orElseThrow(()->new ResourceNotFoundException("Không tìm thấy địa chỉ giao hàng"));
    }

    private void makeDefault(Long userId,ShippingAddress selected) {
        List<ShippingAddress> addresses=shippingAddressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
        clearDefaults(addresses);
        selected.setIsDefault(true);
        shippingAddressRepository.saveAndFlush(selected);
    }

    private void clearDefaults(List<ShippingAddress> addresses) {
        addresses.forEach(address->address.setIsDefault(false));
        shippingAddressRepository.saveAllAndFlush(addresses);
    }

    private void applyAddress(ShippingAddress address,ShippingAddressDto dto) {
        String fullName=trim(dto.getFullName()),phone=trim(dto.getPhone()),detail=trim(dto.getAddress());
        if (fullName==null || fullName.length()>100 || phone==null || !phone.matches("^(\\+84|0)[35789][0-9]{8}$"))
            throw new BadRequestException("Họ tên hoặc số điện thoại người nhận không hợp lệ");
        if (detail==null || detail.length()>2000) throw new BadRequestException("Địa chỉ chi tiết bắt buộc, tối đa 2.000 ký tự");
        address.setFullName(fullName);address.setPhone(phone);address.setAddress(detail);address.setProvince(trim(dto.getProvince()));
        applyStructuredAddress(address,dto);
        if (dto.isNoteProvided() || dto.getNote()!=null) {
            if (dto.getNote()!=null && dto.getNote().length()>1000) throw new BadRequestException("Ghi chú tối đa 1.000 ký tự");
            address.setNote(trim(dto.getNote()));
        }
        if (dto.isTagProvided() || dto.getTag()!=null) {
            String tag=trim(dto.getTag());
            if (tag!=null && !java.util.Set.of("Nhà riêng","Văn phòng","Khác").contains(tag))
                throw new BadRequestException("Loại địa chỉ không hợp lệ");
            address.setTag(tag);
        }
    }

    private boolean sameAddress(ShippingAddress first,ShippingAddress second,ShippingAddressDto dto) {
        return Objects.equals(first.getFullName(),second.getFullName()) && Objects.equals(first.getPhone(),second.getPhone())
                && Objects.equals(first.getAddress(),second.getAddress()) && Objects.equals(first.getProvinceCode(),second.getProvinceCode())
                && Objects.equals(first.getWardCode(),second.getWardCode()) && Objects.equals(first.getAddressDetail(),second.getAddressDetail())
                && (!(dto.isNoteProvided() || dto.getNote()!=null) || Objects.equals(first.getNote(),second.getNote()))
                && (!(dto.isTagProvided() || dto.getTag()!=null) || Objects.equals(first.getTag(),second.getTag()));
    }

    private String trim(String value) {
        return value==null || value.isBlank() ? null : value.trim();
    }

    private void applyStructuredAddress(ShippingAddress address,ShippingAddressDto dto) {
        if (dto.getProvinceCode()==null && dto.getWardCode()==null) {
            address.setProvinceCode(null);address.setWardCode(null);address.setWard(null);address.setAddressDetail(null);
            return;
        }
        String detail=trim(dto.getAddressDetail());
        if (detail==null || detail.length()>2000) throw new BadRequestException("Địa chỉ cụ thể bắt buộc, tối đa 2.000 ký tự");
        var province=administrativeUnits.province(dto.getProvinceCode());
        var ward=administrativeUnits.ward(dto.getProvinceCode(),dto.getWardCode());
        address.setProvinceCode(province.code());address.setWardCode(ward.code());
        address.setProvince(province.name());address.setWard(ward.name());address.setAddressDetail(detail);
        address.setAddress(detail+", "+ward.name()+", "+province.name());
    }

    private ShippingAddressDto toDto(ShippingAddress address) {
        return ShippingAddressDto.builder().id(address.getId()).fullName(address.getFullName()).phone(address.getPhone())
                .address(address.getAddress()).province(address.getProvince()).provinceCode(address.getProvinceCode())
                .wardCode(address.getWardCode()).ward(address.getWard()).addressDetail(address.getAddressDetail())
                .note(address.getNote()).tag(address.getTag()).isDefault(address.getIsDefault()).createdAt(address.getCreatedAt()).build();
    }
}
