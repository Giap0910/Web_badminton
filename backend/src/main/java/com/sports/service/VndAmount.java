package com.sports.service;

import com.sports.exception.BadRequestException;
import java.math.BigDecimal;

public final class VndAmount {
    public static final BigDecimal MAX = new BigDecimal("9999999999");

    private VndAmount() {
    }

    public static BigDecimal requireValid(BigDecimal value) {
        if (value == null || value.signum() < 0 || value.compareTo(MAX) > 0
                || value.stripTrailingZeros().scale() > 0) {
            throw new BadRequestException("Số tiền phải là VND nguyên từ 0 đến 9.999.999.999");
        }
        return value;
    }
}
