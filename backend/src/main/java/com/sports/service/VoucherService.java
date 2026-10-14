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
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VoucherService {

    private final VoucherRepository voucherRepository;
    private final org.springframework.core.env.Environment environment;

    @Transactional(readOnly = true)
    public VoucherValidateResponse validateVoucher(VoucherValidateRequest request) {
        String code = validateRequest(request);
        Voucher voucher = voucherRepository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new ResourceNotFoundException("Mã giảm giá '" + code + "' không tồn tại!"));
        return validateVoucher(voucher, request.getOrderTotal());
    }

    @Transactional
    public VoucherValidateResponse reserveVoucher(VoucherValidateRequest request) {
        String code = validateRequest(request);
        Voucher voucher = voucherRepository.findByCodeForUpdate(code)
                .orElseThrow(() -> new BadRequestException("Mã giảm giá không tồn tại"));
        VoucherValidateResponse result = validateVoucher(voucher, request.getOrderTotal());
        voucher.setUsedCount(usedCount(voucher) + 1);
        voucherRepository.save(voucher);
        return result;
    }

    @Transactional
    public void releaseVoucher(String code) {
        if (code == null || code.isBlank()) return;
        voucherRepository.findByCodeForUpdate(code).ifPresent(voucher -> {
            voucher.setUsedCount(Math.max(0, usedCount(voucher) - 1));
            voucherRepository.save(voucher);
        });
    }

    private VoucherValidateResponse validateVoucher(Voucher voucher, BigDecimal orderTotal) {
        VndAmount.requireValid(orderTotal);
        validateConfiguration(voucher);
        validateEligibility(voucher, orderTotal);
        BigDecimal discount = productDiscount(voucher, orderTotal);
        BigDecimal shippingFee = quoteShipping(orderTotal);
        BigDecimal shippingDiscount = shippingDiscount(voucher, shippingFee);
        return VoucherValidateResponse.builder()
                .valid(true).code(voucher.getCode()).description(voucher.getDescription())
                .discountType(normalizeType(voucher.getDiscountType())).discountValue(voucher.getDiscountValue())
                .discountAmount(discount).finalTotal(VndAmount.requireValid(orderTotal.subtract(discount)))
                .shippingDiscountAmount(shippingDiscount).finalShippingFee(shippingFee.subtract(shippingDiscount))
                .message("Áp dụng mã giảm giá thành công!").build();
    }

    private String validateRequest(VoucherValidateRequest request) {
        if (request == null || request.getCode() == null || request.getCode().isBlank()
                || request.getCode().trim().length() > 50) {
            throw new BadRequestException("Mã voucher không hợp lệ");
        }
        VndAmount.requireValid(request.getOrderTotal());
        return request.getCode().trim();
    }

    private void validateEligibility(Voucher voucher, BigDecimal orderTotal) {
        String code = voucher.getCode();
        if (Boolean.FALSE.equals(voucher.getIsActive())) {
            throw new BadRequestException("Mã giảm giá '" + code + "' đã bị tạm ngưng áp dụng!");
        }

        if (voucher.getExpiresAt() != null && voucher.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Mã giảm giá '" + code + "' đã hết hạn sử dụng!");
        }

        if (usedCount(voucher) == Integer.MAX_VALUE
                || (voucher.getMaxUses() != null && usedCount(voucher) >= voucher.getMaxUses())) {
            throw new BadRequestException("Mã giảm giá '" + code + "' đã hết lượt sử dụng!");
        }

        if (voucher.getMinOrderValue() != null && orderTotal.compareTo(voucher.getMinOrderValue()) < 0) {
            throw new BadRequestException(String.format("Đơn hàng phải từ %,d₫ mới đủ điều kiện áp dụng mã '%s'!",
                    voucher.getMinOrderValue().longValueExact(), code));
        }

    }

    private BigDecimal productDiscount(Voucher voucher, BigDecimal subtotal) {
        String type = normalizeType(voucher.getDiscountType());
        if ("SHIPPING".equals(type)) return BigDecimal.ZERO;
        BigDecimal discount = voucher.getDiscountValue();
        if ("PERCENT".equals(type)) {
            discount = subtotal.multiply(discount).divide(BigDecimal.valueOf(100), 0, RoundingMode.DOWN);
            if (voucher.getMaxDiscountAmount() != null) discount = discount.min(voucher.getMaxDiscountAmount());
            if (discount.signum() == 0) throw new BadRequestException("Mức giảm sau làm tròn phải từ 1 đồng");
        }
        return VndAmount.requireValid(discount.min(subtotal));
    }

    private BigDecimal shippingDiscount(Voucher voucher, BigDecimal shippingFee) {
        if (!"SHIPPING".equals(normalizeType(voucher.getDiscountType()))) return BigDecimal.ZERO;
        if (shippingFee.signum() == 0) throw new BadRequestException("Đơn hàng đã được miễn phí vận chuyển");
        return voucher.getDiscountValue().min(shippingFee);
    }

    public static BigDecimal quoteShipping(BigDecimal subtotal) {
        VndAmount.requireValid(subtotal);
        return subtotal.signum() == 0 || subtotal.compareTo(new BigDecimal("1000000")) >= 0
                ? BigDecimal.ZERO : new BigDecimal("30000");
    }

    private void validateConfiguration(Voucher voucher) {
        String type = normalizeType(voucher.getDiscountType());
        BigDecimal value = voucher.getDiscountValue();
        if ("PERCENT".equals(type)) {
            if (value == null || value.signum() <= 0 || value.compareTo(new BigDecimal("100")) > 0
                    || value.stripTrailingZeros().scale() > 2) {
                throw new BadRequestException("Phần trăm giảm phải lớn hơn 0, không quá 100 và tối đa 2 chữ số thập phân");
            }
        } else {
            VndAmount.requireValid(value);
            if ("SHIPPING".equals(type) && value.signum() == 0)
                throw new BadRequestException("Mức hỗ trợ vận chuyển phải từ 1 đồng");
        }
        if (voucher.getMinOrderValue() != null) VndAmount.requireValid(voucher.getMinOrderValue());
        if (voucher.getMaxDiscountAmount() != null) VndAmount.requireValid(voucher.getMaxDiscountAmount());
        if (usedCount(voucher) < 0 || (voucher.getMaxUses() != null && voucher.getMaxUses() < usedCount(voucher)))
            throw new BadRequestException("Số lượt tối đa không được nhỏ hơn số lượt đã sử dụng");
    }

    private String normalizeType(String value) {
        String type = value == null ? "FIXED" : value.trim().toUpperCase(Locale.ROOT);
        if (!List.of("FIXED", "PERCENT", "SHIPPING").contains(type))
            throw new BadRequestException("Loại voucher không hợp lệ");
        return type;
    }

    private int usedCount(Voucher voucher) {
        return voucher.getUsedCount() == null ? 0 : voucher.getUsedCount();
    }

    @Transactional(readOnly = true)
    public List<VoucherDto> getActiveVouchers() {
        LocalDateTime now = LocalDateTime.now();
        return voucherRepository.findByIsActiveTrue().stream()
                .filter(v -> v.getExpiresAt() == null || v.getExpiresAt().isAfter(now))
                .filter(v -> v.getMaxUses() == null || usedCount(v) < v.getMaxUses())
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
        validateDto(dto);
        String code = normalizeCode(dto.getCode());
        if (voucherRepository.findByCodeIgnoreCase(code).isPresent())
            throw new BadRequestException("Mã voucher đã tồn tại");
        Voucher voucher = Voucher.builder()
                .code(code)
                .description(dto.getDescription())
                .discountType(normalizeType(dto.getDiscountType()))
                .discountValue(dto.getDiscountValue())
                .minOrderValue(dto.getMinOrderValue() != null ? dto.getMinOrderValue() : BigDecimal.ZERO)
                .maxDiscountAmount(dto.getMaxDiscountAmount())
                .maxUses(dto.getMaxUses())
                .usedCount(0)
                .expiresAt(dto.getExpiresAt())
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .build();
        validateConfiguration(voucher);
        return toDto(voucherRepository.save(voucher));
    }

    @Transactional
    public VoucherDto updateVoucher(Long id, VoucherDto dto) {
        validateDto(dto);
        Voucher voucher = voucherRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy voucher với ID: " + id));
        if (dto.getCode() != null && !normalizeCode(dto.getCode()).equalsIgnoreCase(voucher.getCode()))
            throw new BadRequestException("Không thể đổi mã voucher đã tạo; hãy tạo mã mới");
        Voucher updated = configurationForUpdate(voucher, dto);
        validateConfiguration(updated);
        applyConfiguration(voucher, updated);
        return toDto(voucherRepository.save(voucher));
    }

    private Voucher configurationForUpdate(Voucher v, VoucherDto dto) {
        return Voucher.builder().code(v.getCode()).usedCount(usedCount(v))
                .description(dto.getDescription() == null ? v.getDescription() : dto.getDescription())
                .discountType(dto.getDiscountType() == null ? v.getDiscountType() : normalizeType(dto.getDiscountType()))
                .discountValue(dto.getDiscountValue() == null ? v.getDiscountValue() : dto.getDiscountValue())
                .minOrderValue(dto.getMinOrderValue() == null ? v.getMinOrderValue() : dto.getMinOrderValue())
                .maxDiscountAmount(dto.isMaxDiscountAmountProvided() || dto.getMaxDiscountAmount() != null
                        ? dto.getMaxDiscountAmount() : v.getMaxDiscountAmount())
                .maxUses(dto.isMaxUsesProvided() || dto.getMaxUses() != null ? dto.getMaxUses() : v.getMaxUses())
                .expiresAt(dto.isExpiresAtProvided() || dto.getExpiresAt() != null ? dto.getExpiresAt() : v.getExpiresAt())
                .isActive(dto.getIsActive() == null ? v.getIsActive() : dto.getIsActive()).build();
    }

    private void applyConfiguration(Voucher target, Voucher source) {
        target.setDescription(source.getDescription());
        target.setDiscountType(source.getDiscountType());
        target.setDiscountValue(source.getDiscountValue());
        target.setMinOrderValue(source.getMinOrderValue());
        target.setMaxDiscountAmount(source.getMaxDiscountAmount());
        target.setMaxUses(source.getMaxUses());
        target.setExpiresAt(source.getExpiresAt());
        target.setIsActive(source.getIsActive());
    }

    private void validateDto(VoucherDto dto) {
        if (dto == null) throw new BadRequestException("Dữ liệu voucher không hợp lệ");
        if (dto.getDescription() != null && dto.getDescription().length() > 255)
            throw new BadRequestException("Mô tả voucher tối đa 255 ký tự");
    }

    private String normalizeCode(String code) {
        if (code == null || !code.trim().matches("[A-Za-z0-9_-]{1,50}"))
            throw new BadRequestException("Mã voucher phải có 1–50 ký tự chữ, số, gạch ngang hoặc gạch dưới");
        return code.trim().toUpperCase(Locale.ROOT);
    }

    @Transactional
    public void deleteVoucher(Long id) {
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy voucher với ID: " + id));
        voucherRepository.delete(voucher);
    }

    @Transactional
    public void incrementUsedCount(String code) {
        voucherRepository.findByCodeForUpdate(code).ifPresent(voucher -> {
            if (usedCount(voucher) == Integer.MAX_VALUE
                    || (voucher.getMaxUses() != null && usedCount(voucher) >= voucher.getMaxUses()))
                throw new BadRequestException("Mã giảm giá đã hết lượt sử dụng");
            voucher.setUsedCount(usedCount(voucher) + 1);
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
        if (!Boolean.TRUE.equals(environment.getProperty("app.demo-data.enabled",Boolean.class,false))) return;
        if (!environment.acceptsProfiles(org.springframework.core.env.Profiles.of("dev"))) return;
        if (voucherRepository.count() == 0) {
            log.info("Khởi tạo danh sách Voucher demo cho hệ thống HG Badminton...");
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
                    .discountType("SHIPPING")
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
