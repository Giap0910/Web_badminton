package com.sports.service;

import com.sports.dto.VoucherDto;
import com.sports.dto.VoucherValidateRequest;
import com.sports.dto.VoucherValidateResponse;
import com.sports.entity.Voucher;
import com.sports.exception.BadRequestException;
import com.sports.exception.ResourceNotFoundException;
import com.sports.repository.VoucherRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VoucherService {

    private final VoucherRepository voucherRepository;

    @Transactional(readOnly = true)
    public VoucherValidateResponse validateVoucher(VoucherValidateRequest request) {
        String code = request.getCode().trim();
        BigDecimal orderTotal = request.getOrderTotal() != null ? request.getOrderTotal() : BigDecimal.ZERO;

        Voucher voucher = voucherRepository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new ResourceNotFoundException("Mã giảm giá '" + code + "' không tồn tại!"));

        if (Boolean.FALSE.equals(voucher.getIsActive())) {
            throw new BadRequestException("Mã giảm giá '" + code + "' đã bị tạm ngưng áp dụng!");
        }

        if (voucher.getExpiresAt() != null && voucher.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Mã giảm giá '" + code + "' đã hết hạn sử dụng!");
        }

        if (voucher.getMaxUses() != null && voucher.getUsedCount() >= voucher.getMaxUses()) {
            throw new BadRequestException("Mã giảm giá '" + code + "' đã hết lượt sử dụng!");
        }

        if (voucher.getMinOrderValue() != null && orderTotal.compareTo(voucher.getMinOrderValue()) < 0) {
            throw new BadRequestException(String.format("Đơn hàng phải từ %,d₫ mới đủ điều kiện áp dụng mã '%s'!",
                    voucher.getMinOrderValue().longValue(), code));
        }

        BigDecimal discountAmount;
        if ("PERCENT".equalsIgnoreCase(voucher.getDiscountType())) {
            discountAmount = orderTotal.multiply(voucher.getDiscountValue())
                    .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
            if (voucher.getMaxDiscountAmount() != null && discountAmount.compareTo(voucher.getMaxDiscountAmount()) > 0) {
                discountAmount = voucher.getMaxDiscountAmount();
            }
        } else {
            discountAmount = voucher.getDiscountValue();
        }

        // Không được giảm quá tổng đơn hàng
        if (discountAmount.compareTo(orderTotal) > 0) {
            discountAmount = orderTotal;
        }

        BigDecimal finalTotal = orderTotal.subtract(discountAmount);
        if (finalTotal.compareTo(BigDecimal.ZERO) < 0) {
            finalTotal = BigDecimal.ZERO;
        }

        return VoucherValidateResponse.builder()
                .valid(true)
                .code(voucher.getCode())
                .description(voucher.getDescription())
                .discountType(voucher.getDiscountType())
                .discountValue(voucher.getDiscountValue())
                .discountAmount(discountAmount)
                .finalTotal(finalTotal)
                .message("Áp dụng mã giảm giá thành công!")
                .build();
    }

    @Transactional(readOnly = true)
    public List<VoucherDto> getActiveVouchers() {
        LocalDateTime now = LocalDateTime.now();
        return voucherRepository.findByIsActiveTrue().stream()
                .filter(v -> v.getExpiresAt() == null || v.getExpiresAt().isAfter(now))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<VoucherDto> getAllVouchers() {
        return voucherRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public VoucherDto createVoucher(VoucherDto dto) {
        Voucher voucher = Voucher.builder()
                .code(dto.getCode().trim().toUpperCase())
                .description(dto.getDescription())
                .discountType(dto.getDiscountType() != null ? dto.getDiscountType() : "FIXED")
                .discountValue(dto.getDiscountValue())
                .minOrderValue(dto.getMinOrderValue() != null ? dto.getMinOrderValue() : BigDecimal.ZERO)
                .maxDiscountAmount(dto.getMaxDiscountAmount())
                .maxUses(dto.getMaxUses())
                .usedCount(0)
                .expiresAt(dto.getExpiresAt())
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .build();
        return toDto(voucherRepository.save(voucher));
    }

    @Transactional
    public VoucherDto updateVoucher(Long id, VoucherDto dto) {
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy voucher với ID: " + id));
        if (dto.getDescription() != null) voucher.setDescription(dto.getDescription());
        if (dto.getDiscountType() != null) voucher.setDiscountType(dto.getDiscountType());
        if (dto.getDiscountValue() != null) voucher.setDiscountValue(dto.getDiscountValue());
        if (dto.getMinOrderValue() != null) voucher.setMinOrderValue(dto.getMinOrderValue());
        if (dto.getMaxDiscountAmount() != null) voucher.setMaxDiscountAmount(dto.getMaxDiscountAmount());
        if (dto.getMaxUses() != null) voucher.setMaxUses(dto.getMaxUses());
        if (dto.getExpiresAt() != null) voucher.setExpiresAt(dto.getExpiresAt());
        if (dto.getIsActive() != null) voucher.setIsActive(dto.getIsActive());
        return toDto(voucherRepository.save(voucher));
    }

    @Transactional
    public void deleteVoucher(Long id) {
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy voucher với ID: " + id));
        voucherRepository.delete(voucher);
    }

    @Transactional
    public void incrementUsedCount(String code) {
        voucherRepository.findByCodeIgnoreCase(code).ifPresent(voucher -> {
            voucher.setUsedCount(voucher.getUsedCount() + 1);
            voucherRepository.save(voucher);
        });
    }

    private VoucherDto toDto(Voucher v) {
        return VoucherDto.builder()
                .id(v.getId())
                .code(v.getCode())
                .description(v.getDescription())
                .discountType(v.getDiscountType())
                .discountValue(v.getDiscountValue())
                .minOrderValue(v.getMinOrderValue())
                .maxDiscountAmount(v.getMaxDiscountAmount())
                .maxUses(v.getMaxUses())
                .usedCount(v.getUsedCount())
                .expiresAt(v.getExpiresAt())
                .isActive(v.getIsActive())
                .build();
    }

    @PostConstruct
    public void seedInitialVouchers() {
        if (voucherRepository.count() == 0) {
            log.info("Khởi tạo danh sách Voucher demo cho hệ thống Apex Badminton...");
            LocalDateTime nextYear = LocalDateTime.now().plusYears(1);

            Voucher v1 = Voucher.builder()
                    .code("HG10K")
                    .description("Giảm ngay 10.000₫ cho đơn hàng từ 200.000₫")
                    .discountType("FIXED")
                    .discountValue(new BigDecimal("10000"))
                    .minOrderValue(new BigDecimal("200000"))
                    .maxUses(1000)
                    .usedCount(0)
                    .expiresAt(nextYear)
                    .isActive(true)
                    .build();

            Voucher v2 = Voucher.builder()
                    .code("FREESHIP")
                    .description("Miễn phí vận chuyển 30.000₫ cho đơn từ 500.000₫")
                    .discountType("FIXED")
                    .discountValue(new BigDecimal("30000"))
                    .minOrderValue(new BigDecimal("500000"))
                    .maxUses(500)
                    .usedCount(0)
                    .expiresAt(nextYear)
                    .isActive(true)
                    .build();

            Voucher v3 = Voucher.builder()
                    .code("BWF50K")
                    .description("Giảm ngay 50.000₫ cho vợt hoặc giày từ 1.000.000₫")
                    .discountType("FIXED")
                    .discountValue(new BigDecimal("50000"))
                    .minOrderValue(new BigDecimal("1000000"))
                    .maxUses(200)
                    .usedCount(0)
                    .expiresAt(nextYear)
                    .isActive(true)
                    .build();

            Voucher v4 = Voucher.builder()
                    .code("SMASH100")
                    .description("Giảm 100.000₫ cho đơn hàng thi đấu từ 2.500.000₫")
                    .discountType("FIXED")
                    .discountValue(new BigDecimal("100000"))
                    .minOrderValue(new BigDecimal("2500000"))
                    .maxUses(100)
                    .usedCount(0)
                    .expiresAt(nextYear)
                    .isActive(true)
                    .build();

            voucherRepository.saveAll(List.of(v1, v2, v3, v4));
            log.info("Đã tạo 4 voucher demo thành công: HG10K, FREESHIP, BWF50K, SMASH100");
        }
    }
}
