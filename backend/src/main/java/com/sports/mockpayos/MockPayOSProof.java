package com.sports.mockpayos;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sports.service.*;
import com.sports.exception.PaymentLinkException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component @Profile("mock-payos")
@ConditionalOnProperty(name="payos.mock-verified",havingValue="true")
public class MockPayOSProof {
    private final PayOSService signatures;
    private final String key;
    private final ObjectMapper json;

    public MockPayOSProof(PayOSService signatures,ObjectMapper json,
            @Value("${payos.mock-signing-key}") String key) {
        if (key==null || !key.matches("[0-9a-f]{64}")) throw new IllegalStateException("Khóa MOCK chưa được khởi tạo");
        this.signatures=signatures; this.json=json; this.key=key;
    }

    public ObjectNode object() { return json.createObjectNode(); }

    public String encode(Object value) {
        try { return json.writeValueAsString(value); }
        catch (java.io.IOException ex) { throw invalid(); }
    }

    public JsonNode decode(String value) {
        try { return json.readTree(value); }
        catch (java.io.IOException | IllegalArgumentException ex) { throw invalid(); }
    }

    public <T> T authenticated(Object value,Class<T> type) {
        JsonNode data=json.valueToTree(value);
        String signature=signatures.hmacSha256(signatures.canonicalData(data),key);
        return verify(data,signature,type);
    }

    public <T> T verify(JsonNode data,String signature,Class<T> type) {
        if (!signatures.verifyDataSignature(data,signature,key)) throw invalid();
        try { return json.treeToValue(data,type); }
        catch (java.io.IOException ex) { throw invalid(); }
    }

    public JsonNode webhook(JsonNode normalized) {
        ObjectNode envelope=(ObjectNode)normalized.deepCopy();
        JsonNode data=envelope.get("data");
        String signature=signatures.hmacSha256(signatures.canonicalData(data),key);
        if (!signatures.verifyDataSignature(data,signature,key)) throw invalid();
        return envelope.put("signature",signature);
    }

    public static PaymentLinkException invalid() {
        return new PaymentLinkException(502,"PAYOS_INVALID_RESPONSE","Chứng cứ thanh toán mô phỏng không hợp lệ");
    }
}
