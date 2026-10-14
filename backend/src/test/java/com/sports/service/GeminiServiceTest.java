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
        assertTrue(service.chatWithAi(null, new AiChatRequest("Giày")).isFallback());
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
        Product product = Product.builder().id(id).name(category).brand("Yonex").stock(20)
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
        Product victor = Product.builder().id(3L).name("Vợt Victor").brand("Victor").stock(20)
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
