package com.sports.mockpayos;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sports.service.PaymentEnvironmentService;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.MethodParameter;
import org.springframework.http.*;
import org.springframework.http.converter.*;
import org.springframework.http.server.*;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

@RestControllerAdvice(basePackages="com.sports")
public class MockPayOSResponseAdvice implements ResponseBodyAdvice<Object> {
    private final ObjectMapper json;
    private final PaymentEnvironmentService environment;
    private final ObjectProvider<MockPayOSStore> provider;
    public MockPayOSResponseAdvice(ObjectMapper json,PaymentEnvironmentService environment,ObjectProvider<MockPayOSStore> provider) {
        this.json=json; this.environment=environment; this.provider=provider;
    }
    @Override public boolean supports(MethodParameter method,Class<? extends HttpMessageConverter<?>> type) {
        return org.springframework.http.converter.json.MappingJackson2HttpMessageConverter.class.isAssignableFrom(type);
    }
    @Override public Object beforeBodyWrite(Object body,MethodParameter method,MediaType media,
            Class<? extends HttpMessageConverter<?>> type,ServerHttpRequest request,ServerHttpResponse response) {
        if (body==null || !"MOCK".equals(environment.mode())) return body;
        JsonNode tree=json.valueToTree(body); annotate(tree); return tree;
    }
    private void annotate(JsonNode node) {
        if (node.isArray()) { node.forEach(this::annotate); return; }
        if (!node.isObject()) return;
        ObjectNode object=(ObjectNode)node;
        if (object.has("paymentMode")) object.put("paymentMode","MOCK");
        if (object.has("mockProviderStatus") && object.path("orderId").canConvertToLong()) {
            object.put("mockProviderStatus",provider.getObject().status(object.get("orderId").longValue()));
        }
        object.elements().forEachRemaining(this::annotate);
    }
}
