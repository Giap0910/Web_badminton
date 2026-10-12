package com.sports.service;
import com.sports.dto.*;
import com.sports.entity.*;
import com.sports.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.MediaType;
import java.math.BigDecimal;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class GeminiServiceTest {
    ProductRepository repository;
    ProductService products;
    GeminiService service;
    @BeforeEach void setup() {
        repository = mock(ProductRepository.class);
        products = mock(ProductService.class);
        service = new GeminiService(repository, products, mock(AiChatLogRepository.class), mock(UserRepository.class));
        ReflectionTestUtils.setField(service, "modelName", "gemini-1.5-flash");
        Product shoe = Product.builder().id(2L).name("Giày Yonex").brand("Yonex").stock(3)
                .price(new BigDecimal("1200000")).category(Category.builder().name("Giày Cầu Lông").build()).build();
        Product racket = Product.builder().id(1L).name("Vợt Yonex").brand("Yonex").stock(4)
                .price(new BigDecimal("1500000")).category(Category.builder().name("Vợt Cầu Lông").build()).build();
        when(repository.findAll(any(org.springframework.data.jpa.domain.Specification.class))).thenReturn(List.of(racket, shoe));
        when(products.getProductById(2L)).thenReturn(ProductDto.builder().id(2L).name(shoe.getName()).build());
    }
    @Test void missingKeyUsesHonestBasicModeAndCorrectCategory() {
        AiChatResponse response = service.chatWithAi(null, new AiChatRequest("Tôi cần giày Yonex"));
        assertTrue(response.isFallback());
        assertEquals("RULE_BASED", response.getProvider());
        assertEquals(List.of(2L), response.getRecommendedProductIds());
        assertTrue(response.getReply().contains("chế độ tư vấn cơ bản"));
    }
    @Test void upgradedModelUsesHeaderHistoryAndDropsUnknownIds() {
        ReflectionTestUtils.setField(service, "apiKey", "test-key");
        var client = (RestTemplate) ReflectionTestUtils.getField(service, "restTemplate");
        var server = MockRestServiceServer.bindTo(client).build();
        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"))
                .andExpect(header("x-goog-api-key", "test-key"))
                .andExpect(jsonPath("$.contents[0].role").value("user"))
                .andExpect(jsonPath("$.systemInstruction.parts[0].text").value(org.hamcrest.Matchers.containsString("Giày Yonex")))
                .andRespond(withSuccess("{\"candidates\":[{\"content\":{\"parts\":[{\"thought\":true,\"text\":\"ẩn\"},{\"text\":\"{\\\"reply\\\":\\\"Gợi ý giày\\\",\\\"recommendedProductIds\\\":[999,2,2]}\"}]}}]}", MediaType.APPLICATION_JSON));
        AiChatRequest request = new AiChatRequest("Tôi cần giày");
        request.setHistory(List.of(new AiChatRequest.HistoryMessage("user", "Hãng Yonex")));
        AiChatResponse response = service.chatWithAi(null, request);
        assertEquals("gemini-3.8-flash", response.getModel());
        assertFalse(response.isFallback());
        assertEquals(List.of(2L), response.getRecommendedProductIds());
        verify(products, never()).getProductById(999L);
        server.verify();
    }
    @Test void networkErrorFallsBackWithoutPretendingAiSucceeded() {
        ReflectionTestUtils.setField(service, "apiKey", "test-key");
        var client = (RestTemplate) ReflectionTestUtils.getField(service, "restTemplate");
        var server = MockRestServiceServer.bindTo(client).build();
        server.expect(anything()).andRespond(withServerError());
        assertTrue(service.chatWithAi(null, new AiChatRequest("Giày")).isFallback());
        server.verify();
    }
}
