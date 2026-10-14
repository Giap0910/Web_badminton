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
        when(products.getProductById(2L)).thenReturn(ProductDto.builder().id(2L).name(shoe.getName()).inStock(true).build());
    }
    @Test void missingKeyUsesHonestBasicModeAndCorrectCategory() {
        AiChatResponse response = service.chatWithAi(null, new AiChatRequest("Tôi cần giày Yonex"));
        assertTrue(response.isFallback());
        assertEquals("RULE_BASED", response.getProvider());
        assertEquals(List.of(2L), response.getRecommendedProductIds());
        assertTrue(response.getReply().contains("chế độ tư vấn cơ bản"));
    }
    @Test void upgradedModelUsesHeaderHistoryAndDropsUnknownIds() {
        ReflectionTestUtils.setField(service, "provider", "gemini");
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
        ReflectionTestUtils.setField(service, "provider", "gemini");
        ReflectionTestUtils.setField(service, "apiKey", "test-key");
        var client = (RestTemplate) ReflectionTestUtils.getField(service, "restTemplate");
        var server = MockRestServiceServer.bindTo(client).build();
        server.expect(anything()).andRespond(withServerError());
        assertTrue(service.chatWithAi(null, new AiChatRequest("Giày")).isFallback());
        server.verify();
    }

    @Test void openAiUsesRealCatalogHistoryAndRejectsInventedIds() {
        ReflectionTestUtils.setField(service, "openAiKey", "test-openai");
        var server = MockRestServiceServer.bindTo((RestTemplate) ReflectionTestUtils.getField(service, "restTemplate")).build();
        server.expect(requestTo("https://api.openai.com/v1/responses"))
                .andExpect(header("Authorization", "Bearer test-openai"))
                .andExpect(jsonPath("$.model").value("gpt-5.4-mini"))
                .andExpect(jsonPath("$.store").value(false))
                .andExpect(jsonPath("$.input[0].role").value("assistant"))
                .andExpect(jsonPath("$.instructions").value(org.hamcrest.Matchers.containsString("1200000")))
                .andExpect(jsonPath("$.text.format.strict").value(true))
                .andRespond(withSuccess("{\"status\":\"completed\",\"output\":[{\"type\":\"reasoning\"},{\"type\":\"message\",\"content\":[{\"type\":\"output_text\",\"text\":\"{\\\"reply\\\":\\\"Giày Yonex 1.200.000 đồng\\\",\\\"recommendedProductIds\\\":[999,2,2]}\"}]}]}", MediaType.APPLICATION_JSON));
        var request = new AiChatRequest("Tôi cần giày Yonex");
        request.setHistory(List.of(new AiChatRequest.HistoryMessage("model", "Bạn muốn hãng nào?")));
        var response = service.chatWithAi(null, request);
        assertFalse(response.isFallback());
        assertEquals("OPENAI", response.getProvider());
        assertEquals(List.of(2L), response.getRecommendedProductIds());
        server.verify();
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(ints = {401, 429, 503})
    void openAiFailuresUseBasicMode(int status) {
        ReflectionTestUtils.setField(service, "openAiKey", "test-openai");
        var server = MockRestServiceServer.bindTo((RestTemplate) ReflectionTestUtils.getField(service, "restTemplate")).build();
        server.expect(anything()).andRespond(withStatus(org.springframework.http.HttpStatus.valueOf(status)));
        var response = service.chatWithAi(null, new AiChatRequest("Giày Yonex"));
        assertTrue(response.isFallback());
        assertEquals("RULE_BASED", response.getProvider());
        assertEquals(List.of(2L), response.getRecommendedProductIds());
        server.verify();
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {
            "{\"status\":\"incomplete\",\"output\":[]}",
            "{\"status\":\"completed\",\"output\":[{\"type\":\"message\",\"content\":[{\"type\":\"refusal\"}]}]}",
            "{\"status\":\"completed\",\"output\":[]}"})
    void openAiIncompleteOrRefusedResponsesUseBasicMode(String body) {
        ReflectionTestUtils.setField(service, "openAiKey", "test-openai");
        var server = MockRestServiceServer.bindTo((RestTemplate) ReflectionTestUtils.getField(service, "restTemplate")).build();
        server.expect(anything()).andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
        assertTrue(service.chatWithAi(null, new AiChatRequest("Giày Yonex")).isFallback());
        server.verify();
    }

    @Test void promptOmitsPrivateContactStockCountsAndUnavailableVariantChoices() {
        Product shoe=Product.builder().id(2L).name("Giày Yonex").brand("Yonex").stock(987)
                .price(new BigDecimal("1200000")).availableSizes("[36,37,38,39]")
                .category(Category.builder().name("Giày Cầu Lông").build())
                .variants(List.of(choice("36",0,true,false),choice("37",20,true,false),
                        choice("38",20,false,false),choice("39",20,true,true))).build();
        when(repository.findAll(any(org.springframework.data.jpa.domain.Specification.class))).thenReturn(List.of(shoe));
        ReflectionTestUtils.setField(service,"openAiKey","test-openai");
        var server=MockRestServiceServer.bindTo((RestTemplate)ReflectionTestUtils.getField(service,"restTemplate")).build();
        server.expect(anything()).andExpect(jsonPath("$.instructions").value(org.hamcrest.Matchers.allOf(
                org.hamcrest.Matchers.containsString("size=37"),org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("size=36")),
                org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("size=38")),org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("size=39")),
                org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("987")))))
                .andExpect(jsonPath("$.input[0].content").value("Liên hệ [email đã ẩn] [số điện thoại đã ẩn]"))
                .andExpect(jsonPath("$.input[1].content").value("Giày [số điện thoại đã ẩn]"))
                .andRespond(withServerError());
        var request=new AiChatRequest("Giày 0900000000");
        request.setHistory(List.of(new AiChatRequest.HistoryMessage("user","Liên hệ test@example.com +84 900 000 000")));
        assertTrue(service.chatWithAi(null,request).isFallback());server.verify();
        verifyNoInteractions((AiChatLogRepository)ReflectionTestUtils.getField(service,"chatLogRepository"),
                (UserRepository)ReflectionTestUtils.getField(service,"userRepository"));
    }

    private ProductVariant choice(String size,int stock,boolean active,boolean legacy) {
        return ProductVariant.builder().size(size).stock(stock).active(active).legacy(legacy).build();
    }

    @Test void freshDetailStockCheckDropsRecommendationsThatJustSoldOut() {
        when(products.getProductById(2L)).thenReturn(ProductDto.builder().id(2L).inStock(false).build());
        assertTrue(service.chatWithAi(null,new AiChatRequest("Giày")).getRecommendedProducts().isEmpty());
    }

    @Test void invalidHistoryFailsBeforeCatalogProviderAndAdmission() {
        var request=new AiChatRequest("Giày");request.setHistory(java.util.Arrays.asList((AiChatRequest.HistoryMessage)null));
        assertThrows(com.sports.exception.BadRequestException.class,()->service.chatWithAi(null,request));
        request.setHistory(null);assertThrows(com.sports.exception.BadRequestException.class,()->service.chatWithAi(null,request));
        request.setHistory(java.util.Collections.nCopies(7,new AiChatRequest.HistoryMessage("user","Giày")));
        assertThrows(com.sports.exception.BadRequestException.class,()->service.chatWithAi(null,request));
        verifyNoInteractions(repository,products);
    }

    @Test void limiterHasPerClientGlobalAndActiveCapsAndAllowsRequestsAfterWindow() {
        var admission=new GeminiService.Admission();
        var now=java.time.Instant.parse("2026-10-14T00:00:00Z");
        ReflectionTestUtils.setField(admission,"clock",java.time.Clock.fixed(now,java.time.ZoneOffset.UTC));
        var first=admission.enter(1L,"192.0.2.1");
        assertEquals(429,assertThrows(org.springframework.web.server.ResponseStatusException.class,
                ()->admission.enter(1L,"192.0.2.2")).getStatusCode().value());
        var second=admission.enter(2L,"192.0.2.2");
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->admission.enter(3L,"192.0.2.3"));
        admission.leave(first);admission.leave(second);
        for(int count=0;count<5;count++) admission.leave(admission.enter(1L,"192.0.2.1"));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->admission.enter(1L,"192.0.2.1"));
        for(int count=0;count<23;count++) admission.leave(admission.enter(null,"192.0.3."+count));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->admission.enter(null,"198.51.100.1"));
        ReflectionTestUtils.setField(admission,"clock",java.time.Clock.fixed(now.plusSeconds(60),java.time.ZoneOffset.UTC));
        admission.leave(admission.enter(1L,"192.0.2.1"));
    }

    @Test void catalogExceptionReleasesActiveSlotWithoutSavingChatContent() {
        when(repository.findAll(any(org.springframework.data.jpa.domain.Specification.class)))
                .thenThrow(new IllegalStateException("test failure")).thenReturn(List.of());
        assertThrows(IllegalStateException.class,()->service.chatWithAi(1L,"192.0.2.1",new AiChatRequest("Giày")));
        assertTrue(service.chatWithAi(1L,"192.0.2.1",new AiChatRequest("Giày")).isFallback());
    }

    @Test void httpNullHistoryIs400AndSeventhAnonymousRequestIs429WithRetryAfter() throws Exception {
        var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(
                new com.sports.controller.AiChatController(service))
                .setCustomArgumentResolvers(new org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver())
                .setControllerAdvice(new com.sports.exception.GlobalExceptionHandler()).build();
        var post=org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/ai-chat");
        mvc.perform(post.contentType(MediaType.APPLICATION_JSON).content("{\"message\":\"Giày\",\"history\":[null]}"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest());
        for(int count=0;count<6;count++) mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/ai-chat")
                .contentType(MediaType.APPLICATION_JSON).content("{\"message\":\"Giày\"}"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/ai-chat")
                .contentType(MediaType.APPLICATION_JSON).content("{\"message\":\"Giày\"}"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isTooManyRequests())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Retry-After","60"));
    }

    @Test void corsAllowsTokenRequestsAndExposesRetryAfterToTheStorefront() throws Exception {
        var security=new com.sports.security.SecurityConfig(mock(com.sports.security.JwtAuthenticationFilter.class));
        ReflectionTestUtils.setField(security,"allowedOrigins","http://localhost:5173,http://127.0.0.1:5173");
        var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(new com.sports.controller.AiChatController(service))
                .setCustomArgumentResolvers(new org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver())
                .setControllerAdvice(new com.sports.exception.GlobalExceptionHandler())
                .addFilters(new org.springframework.web.filter.CorsFilter(security.corsConfigurationSource())).build();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options("/api/ai-chat")
                .header("Origin","http://localhost:5173").header("Access-Control-Request-Method","POST")
                .header("Access-Control-Request-Headers","Authorization,Content-Type"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Access-Control-Allow-Headers",
                        org.hamcrest.Matchers.allOf(org.hamcrest.Matchers.containsString("Authorization"),org.hamcrest.Matchers.containsString("Content-Type"))));
        for(int count=0;count<6;count++) mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/ai-chat")
                .header("Origin","http://localhost:5173").contentType(MediaType.APPLICATION_JSON).content("{\"message\":\"Giày\"}"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/ai-chat")
                .header("Origin","http://localhost:5173").contentType(MediaType.APPLICATION_JSON).content("{\"message\":\"Giày\"}"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isTooManyRequests())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Access-Control-Allow-Origin","http://localhost:5173"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Access-Control-Expose-Headers",
                        org.hamcrest.Matchers.allOf(org.hamcrest.Matchers.containsString("Authorization"),org.hamcrest.Matchers.containsString("Retry-After"))))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Retry-After","60"));
    }
}
