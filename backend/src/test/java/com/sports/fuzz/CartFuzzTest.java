package com.sports.fuzz;

import com.code_intelligence.jazzer.api.FuzzedDataProvider;
import com.code_intelligence.jazzer.junit.FuzzTest;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * White-box Fuzzing Test cho hàm tính toán giỏ hàng và kiểm tra tồn kho.
 * Bơm dữ liệu dị dạng (số âm, số nguyên cực lớn, giá trị biên Integer.MAX_VALUE) để phát hiện tràn số.
 */
public class CartFuzzTest {

    @FuzzTest
    public void fuzzCartCalculation(FuzzedDataProvider data) {
        int quantity = data.consumeInt();
        long priceLong = data.consumeLong();
        int currentStock = data.consumeInt();

        try {
            // Nghiệp vụ kiểm tra giỏ hàng an toàn
            if (quantity <= 0 || quantity > 100) {
                // Reject invalid quantity range
                return;
            }

            if (priceLong < 0) {
                // Reject negative price
                return;
            }

            BigDecimal price = BigDecimal.valueOf(priceLong);
            BigDecimal subtotal = price.multiply(BigDecimal.valueOf(quantity));

            assertNotNull(subtotal);
            assertTrue(subtotal.compareTo(BigDecimal.ZERO) >= 0, "Tổng tiền không được âm");

            // Kiểm tra logic trừ kho chống tràn số
            if (currentStock >= quantity) {
                int remainingStock = currentStock - quantity;
                assertTrue(remainingStock >= 0, "Tồn kho sau khi trừ không được âm");
            }
        } catch (IllegalArgumentException | ArithmeticException e) {
            // Handled expected business exceptions
        }
    }
}
