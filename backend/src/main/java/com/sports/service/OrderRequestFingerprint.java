package com.sports.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sports.dto.OrderCreateRequest;
import com.sports.dto.OrderItemRequest;
import com.sports.exception.BadRequestException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;

public final class OrderRequestFingerprint {
    private static final ObjectMapper JSON = new ObjectMapper();

    private OrderRequestFingerprint() {
    }

    public static String validateKey(String key) {
        if (key == null || !key.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")) {
            throw new BadRequestException("Idempotency-Key phải là UUID đúng định dạng");
        }
        return UUID.fromString(key).toString();
    }

    public static String hash(OrderCreateRequest request) {
        try {
            byte[] payload = JSON.writeValueAsString(canonicalRequest(request)).getBytes(StandardCharsets.UTF_8);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(payload));
        } catch (JsonProcessingException | NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Không thể xác định dấu vân tay yêu cầu tạo đơn", ex);
        }
    }

    private static Map<String, Object> canonicalRequest(OrderCreateRequest request) {
        Map<String, Object> fields = new TreeMap<>();
        fields.put("customerName", request.getCustomerName());
        fields.put("shippingPhone", request.getShippingPhone());
        fields.put("shippingAddress", request.getShippingAddress());
        fields.put("note", request.getNote());
        fields.put("paymentMethod", blank(request.getPaymentMethod()) ? "PAYOS_VIETQR" : request.getPaymentMethod().trim());
        fields.put("voucherCode", blank(request.getVoucherCode()) ? null : request.getVoucherCode().trim().toUpperCase(Locale.ROOT));
        fields.put("shippingFee", request.getShippingFee() == null ? null : request.getShippingFee().stripTrailingZeros());
        fields.put("items", canonicalItems(request.getItems()));
        return fields;
    }

    private static Object canonicalItems(List<OrderItemRequest> items) {
        if (items == null) return null;
        Comparator<OrderItemRequest> comparator = Comparator.nullsFirst(Comparator.comparing(
                OrderItemRequest::getProductId, Comparator.nullsFirst(Comparator.naturalOrder())));
        return items.stream().sorted(comparator).map(OrderRequestFingerprint::canonicalItem).toList();
    }

    private static Map<String, Object> canonicalItem(OrderItemRequest item) {
        if (item == null) return null;
        Map<String, Object> fields = new TreeMap<>();
        fields.put("productId", item.getProductId());
        fields.put("quantity", item.getQuantity());
        fields.put("selectedSize", item.getSelectedSize());
        fields.put("selectedColor", item.getSelectedColor());
        fields.put("selectedWeight", item.getSelectedWeight());
        fields.put("stringingService", item.getStringingService());
        fields.put("stringTension", item.getStringTension());
        return fields;
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
