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
    @Test void exactModelRangeAndColorNeverFallBackToUnrelatedProducts() {
        Product racket = Product.builder().name("Yonex Nanoflare 1000Z").brand("Yonex")
                .price(new BigDecimal("4390000")).variants(List.of(ProductVariant.builder().color("Vàng").stock(20).build())).build();
        assertEquals(true, ReflectionTestUtils.invokeMethod(service, "matchesRequirements", racket, "1000 z"));
        assertEquals(false, ReflectionTestUtils.invokeMethod(service, "matchesRequirements", racket, "9999z"));
        assertEquals(false, ReflectionTestUtils.invokeMethod(service, "matchesRequirements", racket, "tam 3 - 4 trieu"));
        assertEquals(true, ReflectionTestUtils.invokeMethod(service, "matchesRequirements", racket, "tu 4 den 5 trieu mau vang"));
        assertEquals(false, ReflectionTestUtils.invokeMethod(service, "matchesRequirements", racket, "mau do"));
    }
    @Test void recommendationTextCannotDisplayInventedPriceOrTechnology() {
        var response = AiChatResponse.builder().reply("Giày 1 đồng có công nghệ bịa").recommendedProductIds(List.of(2L)).build();
        ReflectionTestUtils.invokeMethod(service, "enrich", response, List.of(Product.builder().id(2L).build()));
        assertEquals(List.of(2L), response.getRecommendedProductIds());
        assertFalse(response.getReply().contains("1 đồng"));
        assertFalse(response.getReply().contains("công nghệ bịa"));
        assertEquals(1, response.getRecommendedProducts().size());
    }
    @Test void vagueRequestAsksBeforeRecommendingAndImpossibleBudgetDoesNotRelax() {
        var vague = service.chatWithAi(null, new AiChatRequest("Tìm vợt tốt"));
        assertTrue(vague.getRecommendedProductIds().isEmpty());
        assertTrue(vague.getReply().contains("khoảng giá"));
        var impossible = service.chatWithAi(null, new AiChatRequest("Giày Yonex dưới 100k"));
        assertTrue(impossible.getRecommendedProductIds().isEmpty());
        assertTrue(impossible.getReply().contains("không tự thay"));
    }
    @Test void rankingUsesKnownFactsWithoutInventingMissingSpecifications() {
        Product attack = Product.builder().balancePoint("Head-Heavy").stiffness("Stiff").build();
        Product defense = Product.builder().balancePoint("Head-Light").stiffness("Flexible").build();
        assertEquals(10, (int) ReflectionTestUtils.invokeMethod(service, "suitability", attack, "tan cong smash"));
        assertEquals(15, (int) ReflectionTestUtils.invokeMethod(service, "suitability", defense, "phong thu nguoi moi"));
        assertEquals(0, (int) ReflectionTestUtils.invokeMethod(service, "suitability", Product.builder().build(), "tan cong nguoi moi"));
    }
    @Test void strictBudgetBrandAndAvailableSizeAreEnforced() {
        Product shoe = Product.builder().brand("Yonex").price(new BigDecimal("1500000"))
                .variants(List.of(ProductVariant.builder().size("40").stock(20).build(),
                        ProductVariant.builder().size("41").stock(0).build())).build();
        assertEquals(true, ReflectionTestUtils.invokeMethod(service, "matchesRequirements", shoe, "yonex duoi 2 trieu size 40"));
        assertEquals(false, ReflectionTestUtils.invokeMethod(service, "matchesRequirements", shoe, "yonex duoi 1 trieu"));
        assertEquals(false, ReflectionTestUtils.invokeMethod(service, "matchesRequirements", shoe, "victor size 40"));
        assertEquals(false, ReflectionTestUtils.invokeMethod(service, "matchesRequirements", shoe, "yonex size 41"));
        assertEquals(false, ReflectionTestUtils.invokeMethod(service, "matchesRequirements", shoe, "duoi 1,5 trieu"));
        assertEquals(true, ReflectionTestUtils.invokeMethod(service, "matchesRequirements", shoe, "toi da 1,5 trieu"));
    }
    @Test void modelSpacingAndBrandAliasesHaveConsistentRanking() {
        Product model = Product.builder().name("Vợt Yonex Nanoflare 1000Z").brand("Yonex").build();
        int exact = ReflectionTestUtils.invokeMethod(service, "relevance", model, "1000z");
        int spaced = ReflectionTestUtils.invokeMethod(service, "relevance", model, "1000 z");
        assertTrue(exact >= 100);
        assertTrue(spaced >= 100);
        assertEquals("lining", ReflectionTestUtils.invokeMethod(service, "normalize", "Li-Ning"));
        assertEquals("lining", ReflectionTestUtils.invokeMethod(service, "normalize", "Li Ning"));
    }
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
        assertTrue(service.chatWithAi(null, new AiChatRequest("Giày Yonex")).isFallback());
        server.verify();
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.CsvSource({
            "openai, Bây giờ tôi cần vợt Yonex", "gemini, Bây giờ tôi cần vợt Yonex",
            "openai, 'Không cần giày nữa, tôi muốn mua vợt Yonex'",
            "gemini, 'Không cần giày nữa, tôi muốn mua vợt Yonex'"})
    void currentRacketQuestionOverridesOldShoeHistoryForBothProviders(String provider, String question) {
        ReflectionTestUtils.setField(service, "provider", provider);
        ReflectionTestUtils.setField(service, "openAiKey", "test-openai");
        ReflectionTestUtils.setField(service, "apiKey", "test-gemini");
        when(products.getProductById(1L)).thenReturn(ProductDto.builder().id(1L).inStock(true).build());
        var server = MockRestServiceServer.bindTo((RestTemplate) ReflectionTestUtils.getField(service, "restTemplate")).build();
        String instructionPath = "gemini".equals(provider) ? "$.systemInstruction.parts[0].text" : "$.instructions";
        String body = "gemini".equals(provider)
                ? "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"{\\\"reply\\\":\\\"Vợt đang bán\\\",\\\"recommendedProductIds\\\":[1,2]}\"}]}}]}"
                : "{\"status\":\"completed\",\"output\":[{\"type\":\"message\",\"content\":[{\"type\":\"output_text\",\"text\":\"{\\\"reply\\\":\\\"Vợt đang bán\\\",\\\"recommendedProductIds\\\":[1,2]}\"}]}]}";
        server.expect(anything()).andExpect(jsonPath(instructionPath).value(org.hamcrest.Matchers.allOf(
                org.hamcrest.Matchers.containsString("Vợt Yonex"), org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Giày Yonex")))))
                .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
        var request = new AiChatRequest(question);
        request.setHistory(List.of(new AiChatRequest.HistoryMessage("user", "Tôi cần giày Yonex"),
                new AiChatRequest.HistoryMessage("model", "Bạn có thể chọn giày Yonex")));

        var response = service.chatWithAi(null, request);

        assertEquals(List.of(1L), response.getRecommendedProductIds());
        assertFalse(response.isFallback()); verify(products, never()).getProductById(2L); server.verify();
    }

    @Test void currentShoeQuestionOverridesOldRacketHistory() {
        var request = new AiChatRequest("Tôi cần giày Yonex");
        request.setHistory(List.of(new AiChatRequest.HistoryMessage("user", "Tôi cần vợt")));

        var response = service.chatWithAi(null, request);

        assertEquals(List.of(2L), response.getRecommendedProductIds());
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {
            "áo cầu lông", "quần cầu lông", "áo thi đấu", "quần thi đấu", "áo Yonex", "quần Yonex"})
    void currentApparelAliasOverridesOldShoeCategory(String clothing) {
        catalogWithCategory(3L, "Quần Áo Thi Đấu");
        var request = new AiChatRequest("Tôi cần " + clothing);
        request.setHistory(List.of(new AiChatRequest.HistoryMessage("user", "Tôi cần giày Yonex")));

        var response = service.chatWithAi(null, request);

        assertEquals(List.of(3L), response.getRecommendedProductIds());
        verify(products, never()).getProductById(2L);
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {
            "Không muốn giày nữa, tôi cần vợt", "Không mua giày, tôi cần vợt",
            "Không tìm giày, tôi cần vợt", "Không muốn mua giày cầu lông, tôi cần vợt",
            "Không cần đôi giày, tôi cần vợt"})
    void explicitNegationDoesNotTakePriorityOverPositiveCurrentCategory(String question) {
        when(products.getProductById(1L)).thenReturn(ProductDto.builder().id(1L).inStock(true).build());
        var request = new AiChatRequest(question);
        request.setHistory(List.of(new AiChatRequest.HistoryMessage("user", "Giày Yonex")));

        var response = service.chatWithAi(null, request);

        assertEquals(List.of(1L), response.getRecommendedProductIds());
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {
            "Tôi cần quấn cán", "Không cần quần áo, tôi muốn quấn cán", "Không cần áo thi đấu, tôi muốn phụ kiện"})
    void gripAccessoriesDoNotMatchApparelKeywords(String question) {
        catalogWithCategory(5L, "Phụ Kiện Cầu Lông");

        var response = service.chatWithAi(null, new AiChatRequest(question));

        assertEquals(List.of(5L), response.getRecommendedProductIds());
    }

    @Test void removingNegatedMentionKeepsLaterPositiveMentionOfSameCategory() {
        Product victor = Product.builder().id(2L).name("Giày Victor").brand("Victor").stock(20)
                .category(Category.builder().name("Giày Cầu Lông").build()).build();
        when(repository.findAll(any(org.springframework.data.jpa.domain.Specification.class))).thenReturn(List.of(victor));
        var request = new AiChatRequest("Không cần giày Yonex, tôi muốn giày Victor");

        var response = service.chatWithAi(null, request);

        assertEquals(List.of(2L), response.getRecommendedProductIds());
    }

    private void catalogWithCategory(Long id, String category) {
        Product product = Product.builder().id(id).name(category).brand("Yonex").stock(20).accessoryType(id == 5 ? "quan_can" : null)
                .category(Category.builder().name(category).build()).build();
        when(repository.findAll(any(org.springframework.data.jpa.domain.Specification.class))).thenReturn(List.of(product));
        when(products.getProductById(id)).thenReturn(ProductDto.builder().id(id).inStock(true).build());
    }

    @Test void followupUsesMostRecentUserCategoryAndIgnoresAssistantCategory() {
        when(products.getProductById(1L)).thenReturn(ProductDto.builder().id(1L).inStock(true).build());
        var request = new AiChatRequest("Tư vấn mẫu dưới hai triệu");
        request.setHistory(List.of(new AiChatRequest.HistoryMessage("user", "Tôi cần giày"),
                new AiChatRequest.HistoryMessage("model", "Giày Yonex"),
                new AiChatRequest.HistoryMessage("user", "Chuyển sang vợt Yonex"),
                new AiChatRequest.HistoryMessage("model", "Bạn có thể tham khảo giày Yonex")));

        var response = service.chatWithAi(null, request);

        assertEquals(List.of(1L), response.getRecommendedProductIds());
        verify(products, never()).getProductById(2L);
    }

    @Test void assistantOnlyCategoryDoesNotRestrictCustomersGeneralQuestion() {
        when(products.getProductById(1L)).thenReturn(ProductDto.builder().id(1L).inStock(true).build());
        var request = new AiChatRequest("Tôi muốn trang bị Yonex");
        request.setHistory(List.of(new AiChatRequest.HistoryMessage("model", "Bạn cần giày Yonex?")));

        var response = service.chatWithAi(null, request);

        assertEquals(List.of(1L, 2L), response.getRecommendedProductIds());
    }

    @Test void currentBrandRanksAboveOlderUserContextAndAssistantRecommendations() {
        Product yonex = Product.builder().id(1L).name("Vợt Yonex Astrox").brand("Yonex").stock(20)
                .playStyle("Tấn công").balancePoint("Nặng đầu")
                .category(Category.builder().name("Vợt Cầu Lông").build()).build();
        Product victor = Product.builder().id(3L).name("Vợt Victor").brand("Victor").stock(20).balancePoint("Nặng đầu")
                .category(Category.builder().name("Vợt Cầu Lông").build()).build();
        when(repository.findAll(any(org.springframework.data.jpa.domain.Specification.class))).thenReturn(List.of(yonex, victor));
        when(products.getProductById(1L)).thenReturn(ProductDto.builder().id(1L).inStock(true).build());
        when(products.getProductById(3L)).thenReturn(ProductDto.builder().id(3L).inStock(true).build());
        var request = new AiChatRequest("Vợt Victor");
        request.setHistory(List.of(new AiChatRequest.HistoryMessage("user", "Vợt Yonex Astrox tấn công nặng đầu"),
                new AiChatRequest.HistoryMessage("model", "Vợt Yonex Astrox dành cho tấn công nặng đầu")));

        var response = service.chatWithAi(null, request);

        assertEquals(List.of(3L), response.getRecommendedProductIds());
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

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.CsvSource({"0,true,false", "20,false,false", "20,true,true"})
    void categorySwitchDoesNotRecommendUnavailableOrHistoricalVariants(int stock, boolean active, boolean legacy) {
        Product racket = Product.builder().id(1L).name("Vợt Yonex").stock(20)
                .category(Category.builder().name("Vợt Cầu Lông").build())
                .variants(List.of(choice(null, stock, active, legacy))).build();
        when(repository.findAll(any(org.springframework.data.jpa.domain.Specification.class))).thenReturn(List.of(racket));
        var request = new AiChatRequest("Tôi cần vợt");
        request.setHistory(List.of(new AiChatRequest.HistoryMessage("user", "Tôi cần giày")));

        var response = service.chatWithAi(null, request);

        assertTrue(response.getRecommendedProductIds().isEmpty()); verifyNoInteractions(products);
    }

    @Test void freshDetailStockCheckDropsRecommendationsThatJustSoldOut() {
        when(products.getProductById(2L)).thenReturn(ProductDto.builder().id(2L).inStock(false).build());
        assertTrue(service.chatWithAi(null,new AiChatRequest("Giày Yonex")).getRecommendedProducts().isEmpty());
    }

    @Test void invalidHistoryFailsBeforeCatalogProviderAndAdmission() {
        var request=new AiChatRequest("Giày Yonex");request.setHistory(java.util.Arrays.asList((AiChatRequest.HistoryMessage)null));
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
        assertThrows(IllegalStateException.class,()->service.chatWithAi(1L,"192.0.2.1",new AiChatRequest("Giày Yonex")));
        assertTrue(service.chatWithAi(1L,"192.0.2.1",new AiChatRequest("Giày Yonex")).isFallback());
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
    @Test void greetingAndThanksDoNotRecommendOrCallProvider() {
        var greeting = service.chatWithAi(null, new AiChatRequest("Chào shop!"));
        var thanks = service.chatWithAi(null, new AiChatRequest("Cảm ơn bạn"));
        assertTrue(greeting.getReply().contains("trợ lý AI"));
        assertTrue(thanks.getReply().contains("hỗ trợ bạn"));
        assertTrue(greeting.getRecommendedProducts().isEmpty());
        verifyNoInteractions(repository);
    }

    @Test void followupKeepsBudgetAndLatestBrandOverridesOlderBrand() {
        var request = new AiChatRequest("Hãng Victor nhé");
        request.setHistory(List.of(new AiChatRequest.HistoryMessage("user", "Vợt Yonex dưới 2 triệu"),
                new AiChatRequest.HistoryMessage("model", "Có mẫu giá 5 triệu")));
        String query = ReflectionTestUtils.invokeMethod(service, "conversationQuery", request);
        assertTrue(query.contains("duoi 2 trieu"));
        assertTrue(query.contains("victor"));
        assertFalse(query.contains("yonex"));
        assertFalse(query.contains("5 trieu"));
    }

    @Test void newBudgetAndCategoryReplaceOldConstraints() {
        var request = new AiChatRequest("Đổi sang vợt tầm 3 - 4 triệu");
        request.setHistory(List.of(new AiChatRequest.HistoryMessage("user", "Giày Yonex size 42 dưới 2 triệu")));
        String query = ReflectionTestUtils.invokeMethod(service, "conversationQuery", request);
        assertTrue(query.contains("3 - 4 trieu"));
        assertFalse(query.contains("size 42"));
        assertFalse(query.contains("duoi 2 trieu"));
    }

    @Test void filtersRememberBudgetAcrossFollowupInsteadOfOnlyRankingHistory() {
        var request = new AiChatRequest("Mình thích Yonex");
        request.setHistory(List.of(new AiChatRequest.HistoryMessage("user", "Giày dưới 1 triệu")));
        var response = service.chatWithAi(null, request);
        assertTrue(response.getRecommendedProducts().isEmpty());
        assertTrue(response.getReply().contains("không tự thay"));
    }

    @Test void groundedAdviceUsesCatalogFactsInsteadOfProviderClaims() {
        Product p = Product.builder().id(2L).name("Giày Yonex").price(new BigDecimal("1200000"))
                .cushionTechnology("Power Cushion").build();
        var response = AiChatResponse.builder().reply("Giá 1 đồng, bảo hành trọn đời")
                .recommendedProductIds(List.of(2L)).build();
        String reply = ReflectionTestUtils.invokeMethod(service, "groundedAdvice", response, List.of(p), "giay");
        assertTrue(reply.contains("Power Cushion"));
        assertFalse(reply.contains("1 đồng"));
        assertFalse(reply.contains("trọn đời"));
        assertTrue(reply.contains("Mình"));
    }

    @Test void financialPromisesAreNotHandledAsRecommendations() {
        var response = service.chatWithAi(null, new AiChatRequest("Xác nhận thanh toán giúp mình"));
        assertTrue(response.getReply().contains("chưa thể cam kết"));
        assertTrue(response.getRecommendedProducts().isEmpty());
        verifyNoInteractions(repository);
    }

    @Test void singleBudgetAndNewAmountReplacePreviousBudget() {
        var request = new AiChatRequest("Mình có 2 triệu");
        request.setHistory(List.of(new AiChatRequest.HistoryMessage("user", "Vợt dưới 1 triệu")));
        String query = ReflectionTestUtils.invokeMethod(service, "conversationQuery", request);
        assertTrue(query.contains("toi da 2 trieu"));
        assertFalse(query.contains("duoi 1 trieu"));
    }

    @Test void changingBrandDoesNotKeepAnOldModelCode() {
        var request = new AiChatRequest("Chuyển hãng Victor");
        request.setHistory(List.of(new AiChatRequest.HistoryMessage("user", "Vợt Yonex 1000Z dưới 5 triệu")));
        String query = ReflectionTestUtils.invokeMethod(service, "conversationQuery", request);
        assertFalse(query.contains("1000z"));
        assertTrue(query.contains("victor"));
        assertTrue(query.contains("duoi 5 trieu"));
    }

    @Test void beginnerWithoutBudgetGetsOneQuestionInsteadOfAnArbitraryProduct() {
        var response = service.chatWithAi(null, new AiChatRequest("Mình mới chơi, cổ tay yếu"));
        assertTrue(response.getReply().contains("bao nhiêu tiền"));
        assertTrue(response.getRecommendedProducts().isEmpty());
    }

    @Test void racketCategoryDoesNotIncludeRacketBags() {
        Product bag = Product.builder().id(9L).name("Balo Yonex").brand("Yonex").stock(4)
                .price(new BigDecimal("1000000")).category(Category.builder().name("Balo & Bao Vợt").build()).build();
        when(repository.findAll(any(org.springframework.data.jpa.domain.Specification.class))).thenReturn(List.of(bag));
        var response = service.chatWithAi(null, new AiChatRequest("Tôi cần vợt Yonex dưới 2 triệu"));
        assertTrue(response.getRecommendedProducts().isEmpty());
        verify(products, never()).getProductById(9L);
    }

    @Test void naturalGreetingsAndSmallTalkNeverForceCatalogCards() {
        for (String message : List.of("Xin chào bạn ạ!", "Shop ơi", "Bạn có khỏe không?", "Cảm ơn bạn nhiều")) {
            var response = service.chatWithAi(null, new AiChatRequest(message));
            assertFalse(response.getReply().isBlank());
            assertTrue(response.getRecommendedProductIds().isEmpty());
            assertTrue(response.getRecommendedProducts().isEmpty());
        }
        verifyNoInteractions(repository, products);
    }

    @Test void conversationKeepsProviderTextAndHistoryWithoutCatalogRecommendations() {
        ReflectionTestUtils.setField(service, "openAiKey", "test-openai");
        var server = MockRestServiceServer.bindTo((RestTemplate) ReflectionTestUtils.getField(service, "restTemplate")).build();
        server.expect(anything()).andExpect(jsonPath("$.input[0].content").value("Hôm nay mình hơi mệt"))
                .andExpect(jsonPath("$.instructions").value(org.hamcrest.Matchers.containsString("không ép khách mua")))
                .andRespond(withSuccess("{\"status\":\"completed\",\"output\":[{\"type\":\"message\",\"content\":[{\"type\":\"output_text\",\"text\":\"{\\\"reply\\\":\\\"Mình nghe bạn nói rồi. Bạn muốn kể thêm không?\\\",\\\"recommendedProductIds\\\":[999]}\"}]}]}", MediaType.APPLICATION_JSON));
        var request = new AiChatRequest("Mình muốn trò chuyện một chút");
        request.setHistory(List.of(new AiChatRequest.HistoryMessage("user", "Hôm nay mình hơi mệt")));
        var response = service.chatWithAi(null, request);
        assertEquals("Mình nghe bạn nói rồi. Bạn muốn kể thêm không?", response.getReply());
        assertFalse(response.isFallback()); assertTrue(response.getRecommendedProductIds().isEmpty());
        verifyNoInteractions(repository, products); server.verify();
    }

    @Test void technicalQuestionAndOfflineConversationDoNotBecomeProductSearch() {
        var knowledge = service.chatWithAi(null, new AiChatRequest("Vợt 3U và 4U khác nhau thế nào?"));
        assertTrue(knowledge.getReply().contains("4U thường nhẹ hơn 3U"));
        var chat = service.chatWithAi(null, new AiChatRequest("Hôm nay mình hơi buồn"));
        assertTrue(chat.getReply().contains("kể thêm"));
        assertTrue(chat.getRecommendedProducts().isEmpty());
        verifyNoInteractions(repository);
    }
    @Test void shortBudgetReplyKeepsThePreviousProductCategory() {
        var request = new AiChatRequest("2 triệu nhé");
        request.setHistory(List.of(new AiChatRequest.HistoryMessage("user", "Mình cần giày Yonex"),
                new AiChatRequest.HistoryMessage("model", "Bạn dự tính ngân sách bao nhiêu?")));
        var response = service.chatWithAi(null, request);
        assertEquals(List.of(2L), response.getRecommendedProductIds());
        assertTrue(response.getReply().contains("Giày Yonex"));
    }

    @Test void vagueCategoryQuestionAsksBudgetWithoutProductCards() {
        var response = service.chatWithAi(null, new AiChatRequest("Giày"));
        assertTrue(response.getReply().contains("khoảng giá"));
        assertTrue(response.getRecommendedProductIds().isEmpty());
    }
    @Test void priceRangeAcceptsNaturalWordingAndEnforcesBothInclusiveBounds() {
        for (String wording : List.of("2 đến 3 triệu", "2-3 triệu", "2–3 triệu", "2—3 triệu",
                "từ 2 triệu đến 3 triệu", "tầm 2tr đến 3tr", "khoảng 2000 đến 3000k")) {
            String query = ReflectionTestUtils.invokeMethod(service, "normalize", "Giày cầu lông " + wording);
            for (int price : List.of(950000, 1999999, 2000000, 2500000, 3000000, 3000001)) {
                var product = Product.builder().price(BigDecimal.valueOf(price)).build();
                assertEquals(price >= 2000000 && price <= 3000000,
                        ReflectionTestUtils.invokeMethod(service, "matchesRequirements", product, query), wording + " price=" + price);
            }
        }
    }

    @Test void latestRangeReplacesOldBudgetAndCannotRecommendNineHundredFiftyThousandShoe() {
        var request = new AiChatRequest("Giày cầu lông 2 đến 3 triệu");
        request.setHistory(List.of(new AiChatRequest.HistoryMessage("user", "Giày dưới 1 triệu")));
        String query = ReflectionTestUtils.invokeMethod(service, "conversationQuery", request);
        assertTrue(query.contains("2 den 3 trieu")); assertFalse(query.contains("duoi 1 trieu"));
        Product cheap = Product.builder().id(3L).name("Giày Kawasaki").stock(4).price(new BigDecimal("950000"))
                .category(Category.builder().name("Giày Cầu Lông").build()).build();
        Product fitting = Product.builder().id(4L).name("Giày Victor").stock(4).price(new BigDecimal("2250000"))
                .category(Category.builder().name("Giày Cầu Lông").build()).build();
        when(repository.findAll(any(org.springframework.data.jpa.domain.Specification.class))).thenReturn(List.of(cheap, fitting));
        when(products.getProductById(4L)).thenReturn(ProductDto.builder().id(4L).name("Giày Victor").inStock(true).build());
        var response = service.chatWithAi(null, request);
        assertEquals(List.of(4L), response.getRecommendedProductIds());
        verify(products, never()).getProductById(3L);
    }

    @Test void rangeSupportsSeparateUnitsAndRejectsReversedBounds() {
        var product = Product.builder().price(new BigDecimal("1250000")).build();
        assertEquals(true, ReflectionTestUtils.invokeMethod(service, "matchesPriceRange", product, "1 trieu den 1500k"));
        assertEquals(true, ReflectionTestUtils.invokeMethod(service, "matchesPriceRange", product, "1,2 den 1,5 trieu"));
        assertEquals(false, ReflectionTestUtils.invokeMethod(service, "matchesPriceRange", product, "3 den 2 trieu"));
    }
    private Product auditProduct(long id, String name, String category) {
        return Product.builder().id(id).name(name).brand("Yonex").stock(10).price(new BigDecimal("200000"))
                .category(Category.builder().name(category).build()).build();
    }

    @Test void catalogAuditQueriesRespectAccessoryTypeApparelGenderAndSoftShaft() {
        var grip = auditProduct(21L, "Quấn cán", "Phụ Kiện"); grip.setAccessoryType("quan_can");
        var string = auditProduct(22L, "Cước BG65", "Phụ Kiện"); string.setAccessoryType("day_cuoc");
        var shuttle = auditProduct(23L, "Quả cầu", "Phụ Kiện"); shuttle.setAccessoryType("qua_cau");
        var bag = auditProduct(24L, "Túi cầu lông", "Balo & Bao Vợt");
        var shirt = auditProduct(25L, "Áo cầu lông", "Quần Áo"); shirt.setGender("Nữ");
        shirt.setVariants(List.of(ProductVariant.builder().size("L").stock(5).build()));
        var pants = auditProduct(26L, "Quần nam", "Quần Áo"); pants.setGender("Nam");
        var soft = auditProduct(27L, "Vợt mềm", "Vợt Cầu Lông"); soft.setStiffness("Flexible (Dẻo)");
        var hard = auditProduct(28L, "Vợt cứng", "Vợt Cầu Lông"); hard.setStiffness("Stiff");
        when(repository.findAll(any(org.springframework.data.jpa.domain.Specification.class))).thenReturn(List.of(grip,string,shuttle,bag,shirt,pants,soft,hard));
        when(products.getProductById(anyLong())).thenAnswer(call -> ProductDto.builder().id(call.getArgument(0)).inStock(true).build());
        String[] questions = {"Quấn cán dưới 300k", "Quả cầu dưới 500k", "Túi cầu lông dưới 1 triệu", "Áo nữ size L dưới 500k", "Vợt thân mềm dưới 2 triệu"};
        long[] expected = {21,23,24,25,27};
        for (int index=0; index<questions.length; index++)
            assertEquals(List.of(expected[index]), service.chatWithAi(null, new AiChatRequest(questions[index])).getRecommendedProductIds(), questions[index]);
    }

    @Test void explicitDongPricesAndModelCodesDoNotInterfere() {
        var p = auditProduct(31L, "Vợt Yonex Arcsaber 11", "Vợt Cầu Lông"); p.setPrice(new BigDecimal("2500000"));
        for (String text : List.of("giày từ 2000000 đến 3000000 đồng", "giày từ 2.000.000 đến 3.000.000đ", "giày 2,000,000-3,000,000 VND")) {
            String query = ReflectionTestUtils.invokeMethod(service,"normalize",text);
            assertEquals(true, ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,query),text);
        }
        assertEquals(true, ReflectionTestUtils.invokeMethod(service,"matchesModel",p,"arcsaber 11"));
        assertEquals(false, ReflectionTestUtils.invokeMethod(service,"matchesModel",p,"arcsaber 77"));
        p.setName("Yonex BG65");
        assertEquals(true, ReflectionTestUtils.invokeMethod(service,"matchesModel",p,"cuoc bg65"));
        assertEquals(false, ReflectionTestUtils.invokeMethod(service,"matchesModel",p,"cuoc bg66"));
    }

    @Test void colorsTechnicalRequirementsAndMissingFactsAreStrict() {
        var p = auditProduct(32L,"Vợt Yonex","Vợt Cầu Lông");
        p.setVariants(List.of(ProductVariant.builder().stock(5).color("Red").weightGrip("4U-G5").build()));
        p.setStiffness("Dẻo"); p.setMaxTension("20-30 lbs"); p.setBalancePoint("Head-Light");
        assertEquals(true, ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"mau do 4u-g5 than mem nhe dau cang 28 lbs"));
        assertEquals(false, ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"mau tim"));
        assertEquals(false, ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"cang 31 lbs"));
        assertEquals(false, ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"than cung"));
        p.setGender(null); assertEquals(false, ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"nu"));
        p.setCapacity("30 lít"); p.setWaterproof("Có"); p.setFabricType("Polyester");
        assertEquals(true, ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"dung tich 30 lit chong nuoc polyester"));
        assertEquals(false, ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"it nhat 40 lit"));
        assertEquals(false, ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"cotton"));
    }

    @Test void knownModelSpecificationQuestionUsesCatalogWithoutProvider() {
        var p = auditProduct(33L,"Vợt Yonex Arcsaber 11","Vợt Cầu Lông"); p.setStiffness("Stiff");
        when(repository.findAll(any(org.springframework.data.jpa.domain.Specification.class))).thenReturn(List.of(p));
        var result = service.chatWithAi(null,new AiChatRequest("Thông số vợt Arcsaber 11 là gì?"));
        assertTrue(result.getReply().contains("Stiff")); assertTrue(result.getReply().contains("Chưa có thông tin"));
        assertTrue(result.getRecommendedProducts().isEmpty());
    }

    @Test void compactContextRetainsConstraintsAfterConversationalTurns() {
        var request = new AiChatRequest("Giày nữ màu đỏ dưới 2 triệu");
        var first = service.chatWithAi(null,request);
        assertTrue(first.getShoppingContext().contains("duoi 2 trieu"));
        var followup = new AiChatRequest("size 40");
        followup.setHistory(List.of(new AiChatRequest.HistoryMessage("user",first.getShoppingContext()),
                new AiChatRequest.HistoryMessage("model","Bạn cần cỡ nào?")));
        String query=ReflectionTestUtils.invokeMethod(service,"conversationQuery",followup);
        assertTrue(query.contains("duoi 2 trieu")); assertTrue(query.contains("nu"));
        assertTrue(query.contains("mau do")); assertTrue(query.contains("size 40"));
    }
    @Test void shoeTechnologyMaterialAndPackLengthRequireMatchingCatalogFacts() {
        var p=auditProduct(41L,"Giày Yonex","Giày Cầu Lông");
        p.setCushionTechnology("Power Cushion+"); p.setSoleType("Rubber"); p.setUpperMaterial("Synthetic Mesh");
        assertEquals(true,ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"dem power cushion+ de cao su mat giay luoi"));
        assertEquals(false,ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"dem eva"));
        assertEquals(false,ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"mat giay da pu"));
        p.setFrameMaterial("Graphite");p.setShaftMaterial(null);
        assertEquals(true,ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"khung graphite"));
        assertEquals(false,ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"than graphite"));
        p.setQuantityPerPack("10m");
        assertEquals(true,ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"10m"));
        assertEquals(false,ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"200m"));
    }

    @Test void bagRacketCapacityIsNotMistakenForLiters() {
        var p=auditProduct(42L,"Túi Yonex","Balo & Bao Vợt");p.setCapacity("3 vợt");p.setRacketCapacity(3);
        assertEquals(false,ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"dung tich 3 lit"));
        assertEquals(true,ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"chua 3 vot"));
        assertEquals(false,ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"chua 6 vot"));
        assertEquals(false,ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"chua 999999999999999999999 vot"));
        p.setWaterproof("Chống thấm nhẹ");
        assertEquals(true,ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"chong tham"));
        assertEquals(false,ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"chong nuoc"));
    }

    @Test void stocklessKnownProductCanStillAnswerSpecificationsButNeverBecomePurchaseRecommendation() {
        var p=auditProduct(43L,"Yonex Arcsaber 11","Vợt Cầu Lông");p.setStock(0);p.setMaxTension("28 lbs");
        when(repository.findAll(any(org.springframework.data.jpa.domain.Specification.class))).thenReturn(List.of(p));
        var answer=service.chatWithAi(null,new AiChatRequest("Thông số Arcsaber 11 là gì?"));
        assertTrue(answer.getReply().contains("Hết hàng"));assertTrue(answer.getReply().contains("28 lbs"));
        assertTrue(answer.getRecommendedProducts().isEmpty());
    }

    @Test void minimumBudgetAndEnglishVietnameseColorsAreHandledWithoutRelaxingConstraints() {
        var p=auditProduct(44L,"Vợt","Vợt Cầu Lông");p.setPrice(new BigDecimal("2000000"));
        assertEquals(true,ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"it nhat 2 trieu"));
        assertEquals(false,ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"tren 2 trieu"));
        assertEquals(false,ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,"duoi 2 trieu"));
        assertEquals("do",ReflectionTestUtils.invokeMethod(service,"colorText","Red"));
        assertEquals("tim",ReflectionTestUtils.invokeMethod(service,"colorText","Purple"));
    }
    @Test void plainPriceFollowingCategoryIsNotSilentlyIgnored() {
        var request = new AiChatRequest("Giày 2.500.000đ");
        String query=ReflectionTestUtils.invokeMethod(service,"conversationQuery",request);
        assertTrue(query.contains("toi da 2500000 dong"));
        var p=auditProduct(49L,"Giày","Giày Cầu Lông");p.setPrice(new BigDecimal("3000000"));
        assertEquals(false,ReflectionTestUtils.invokeMethod(service,"matchesRequirements",p,query));
    }
    @Test void unrecognizedNamedTechnologyAsksInsteadOfIgnoringTheRequirement() {
        var result=service.chatWithAi(null,new AiChatRequest("Giày đệm SuperMagic dưới 2 triệu"));
        assertTrue(result.getReply().contains("chưa xác định")); assertTrue(result.getRecommendedProducts().isEmpty());
        verifyNoInteractions(repository);
    }
}
