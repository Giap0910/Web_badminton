package com.sports.security;

import com.sports.entity.Role;
import com.sports.entity.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.security.SecureRandom;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@ExtendWith(OutputCaptureExtension.class)
class JwtTokenProviderTest {

    @Test
    void missingEnvironmentSecretFailsContextStartup() {
        contextRunner().run(context -> {
            assertThat(context).hasFailed();
            assertThat(context.getStartupFailure()).hasStackTraceContaining("JWT_SECRET");
        });
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t\n", "xyz", "ab", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"})
    void invalidSecretFailsProviderInitialization(String secret) {
        JwtTokenProvider provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(provider, "jwtSecret", secret);

        IllegalStateException failure = assertThrows(IllegalStateException.class, provider::validateSigningKey);

        assertThat(failure).hasMessage("JWT signing secret is missing or invalid").hasNoCause();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "xyz", "ab"})
    void invalidEnvironmentSecretFailsContextStartup(String secret) {
        contextRunner().withPropertyValues("JWT_SECRET=" + secret).run(context -> {
            assertThat(context).hasFailed();
            assertThat(context.getStartupFailure())
                    .hasRootCauseMessage("JWT signing secret is missing or invalid");
        });
    }

    @Test
    void malformedLongSecretDoesNotLeakInStartupFailure(CapturedOutput output) {
        String secret = randomSecret() + "invalid-sensitive-sentinel";

        contextRunner().withPropertyValues("JWT_SECRET=" + secret).run(context -> {
            assertThat(context).hasFailed();
            assertThat(context.getStartupFailure()).hasStackTraceContaining("JWT signing secret is missing or invalid");
            assertThat(context.getStartupFailure()).hasStackTraceContaining("IllegalStateException");
        });

        assertThat(output.getAll()).doesNotContain(secret, "invalid-sensitive-sentinel");
    }

    @Test
    void validEnvironmentSecretPreservesTokenClaimsAndAlgorithm(CapturedOutput output) {
        String secret = randomSecret();

        contextRunner().withPropertyValues("JWT_SECRET=" + secret).run(context -> {
            assertThat(context).hasNotFailed();
            JwtTokenProvider provider = context.getBean(JwtTokenProvider.class);
            String token = provider.generateToken(authentication());
            assertThat(provider.validateToken(token)).isTrue();
            assertThat(provider.getUsernameFromJwt(token)).isEqualTo("jwt-test");
            assertThat(provider.getUserIdFromJwt(token)).isEqualTo(7L);
            var parsed = Jwts.parserBuilder().setSigningKey(Keys.hmacShaKeyFor(HexFormat.of().parseHex(secret)))
                    .build().parseClaimsJws(token);
            assertThat(parsed.getHeader().getAlgorithm()).isEqualTo("HS256");
            assertThat(parsed.getBody().get("role")).isEqualTo("ROLE_USER");
            assertThat(parsed.getBody().get("email")).isEqualTo("jwt-test@example.invalid");
            assertThat(provider.getTokenVersionFromJwt(token)).isZero();
            assertThat(parsed.getBody().getExpiration().getTime() - parsed.getBody().getIssuedAt().getTime())
                    .isEqualTo(86400000L);
            assertThat(output.getAll()).doesNotContain(secret, token);
        });
    }

    @Test void legacyTokensHaveVersionZeroAndUpdatedTokensCarryLongVersion() {
        String secret=randomSecret();JwtTokenProvider provider=provider(secret);
        String legacy=Jwts.builder().setSubject("jwt-test").claim("userId",7L)
                .setExpiration(new java.util.Date(System.currentTimeMillis()+60000))
                .signWith(Keys.hmacShaKeyFor(HexFormat.of().parseHex(secret))).compact();
        assertThat(provider.getTokenVersionFromJwt(legacy)).isZero();
        User user=User.builder().id(7L).username("jwt-test").role(Role.ROLE_USER).tokenVersion(3L).build();
        String token=provider.generateToken(new UsernamePasswordAuthenticationToken(new CustomUserDetails(user),null));
        assertThat(provider.getTokenVersionFromJwt(token)).isEqualTo(3L);
    }

    private JwtTokenProvider provider(String secret) {
        var provider=new JwtTokenProvider();ReflectionTestUtils.setField(provider,"jwtSecret",secret);
        ReflectionTestUtils.setField(provider,"jwtExpirationMs",86400000L);return provider;
    }

    private WebFixture webFixture() {
        String secret=randomSecret();var provider=provider(secret);
        var encoder=new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(4);
        User user=User.builder().id(7L).username("jwt-test").email("jwt-test@example.invalid").fullName("Khách kiểm thử")
                .password(encoder.encode("old-secret")).role(Role.ROLE_USER).build();
        var users=org.mockito.Mockito.mock(com.sports.repository.UserRepository.class);
        var orders=org.mockito.Mockito.mock(com.sports.repository.OrderRepository.class);
        org.mockito.Mockito.when(users.findByUsername("jwt-test")).thenAnswer(call->java.util.Optional.of(user));
        org.mockito.Mockito.when(users.findById(7L)).thenAnswer(call->java.util.Optional.of(user));
        org.mockito.Mockito.when(users.findByIdForUpdate(7L)).thenAnswer(call->java.util.Optional.of(user));
        org.mockito.Mockito.when(users.save(org.mockito.ArgumentMatchers.any())).thenAnswer(call->call.getArgument(0));
        org.mockito.Mockito.when(users.saveAndFlush(org.mockito.ArgumentMatchers.any())).thenAnswer(call->call.getArgument(0));
        var auth=new com.sports.service.AuthService(org.mockito.Mockito.mock(
                org.springframework.security.authentication.AuthenticationManager.class),users,encoder,provider);
        var profile=new com.sports.service.UserService(users,encoder,orders);
        var web=new org.springframework.web.context.support.AnnotationConfigWebApplicationContext();
        web.setServletContext(new org.springframework.mock.web.MockServletContext());
        web.register(SecurityConfig.class,com.sports.controller.AuthController.class,com.sports.controller.UserController.class,
                com.sports.controller.AdminUserController.class,com.sports.exception.GlobalExceptionHandler.class,WebConfig.class);
        web.addBeanFactoryPostProcessor(factory->{
            factory.registerSingleton("authService",auth);factory.registerSingleton("userService",profile);
            factory.registerSingleton("jwtAuthenticationFilter",new JwtAuthenticationFilter(provider,new UserDetailsServiceImpl(users)));
        });web.refresh();return new WebFixture(web,provider,user,users,secret);
    }

    private record WebFixture(org.springframework.web.context.support.AnnotationConfigWebApplicationContext context,
            JwtTokenProvider provider,User user,com.sports.repository.UserRepository users,String secret) {
        String token() { return provider.generateToken(new UsernamePasswordAuthenticationToken(new CustomUserDetails(user),null)); }
    }

    @org.springframework.context.annotation.Configuration
    @org.springframework.web.servlet.config.annotation.EnableWebMvc
    static class WebConfig {}

    @Test void httpLogoutRequiresAuthenticationAndRevokesAllPreviouslyIssuedTokens() throws Exception {
        var fixture=webFixture();
        try (var web=fixture.context()) {
            var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup(web)
                    .apply(org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity()).build();
            String first=fixture.token(),second=fixture.token();
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/auth/logout"))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/auth/me").header("Authorization","Bearer "+first))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/auth/logout").header("Authorization","Bearer "+first))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
            assertThat(fixture.user().getTokenVersion()).isEqualTo(1L);
            for (String token:java.util.List.of(first,second))
                mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/auth/me").header("Authorization","Bearer "+token))
                        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/auth/me").header("Authorization","Bearer "+fixture.token()))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.tokenVersion").doesNotExist());
        }
    }

    @Test void httpPasswordByteLimitAndSuccessRevokeWorkWithRealBcryptAndJwtFilter() throws Exception {
        var fixture=webFixture();
        try (var web=fixture.context()) {
            var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup(web)
                    .apply(org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity()).build();
            String token=fixture.token(),path="/api/users/change-password";
            String invalid="{\"currentPassword\":\"old-secret\",\"newPassword\":\""+ "đ".repeat(37)+"\"}";
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(path).header("Authorization","Bearer "+token)
                    .contentType("application/json").content(invalid)).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest());
            assertThat(fixture.user().getTokenVersion()).isZero();
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(path).header("Authorization","Bearer "+token)
                    .contentType("application/json").content("{\"currentPassword\":\"old-secret\",\"newPassword\":\"new-secret\"}"))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
            assertThat(new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().matches("new-secret",fixture.user().getPassword())).isTrue();
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/auth/me").header("Authorization","Bearer "+token))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
        }
    }

    @Test void httpAdminCannotSelfDeactivateUserCannotManageAccountsAndNullStatusFails() throws Exception {
        var fixture=webFixture();
        try (var web=fixture.context()) {
            var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup(web)
                    .apply(org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity()).build();
            String path="/api/admin/users/7/status",userToken=fixture.token();
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(path).header("Authorization","Bearer "+userToken)
                    .param("active","false")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());
            fixture.user().setRole(Role.ROLE_ADMIN);String adminToken=fixture.token();
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(path).header("Authorization","Bearer "+adminToken)
                    .param("active","false")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest());
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(path).header("Authorization","Bearer "+adminToken)
                    .param("active","null")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest());
            assertThat(fixture.user().getIsActive()).isTrue();assertThat(fixture.user().getTokenVersion()).isZero();
        }
    }

    @Test void httpChecksTokenUserIdLegacyVersionAndRejectsLockedOrReactivatedOldSession() throws Exception {
        var fixture=webFixture();
        try (var web=fixture.context()) {
            var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup(web)
                    .apply(org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity()).build();
            String old=Jwts.builder().setSubject("jwt-test").claim("userId",7L)
                    .setExpiration(new java.util.Date(System.currentTimeMillis()+60000))
                    .signWith(Keys.hmacShaKeyFor(HexFormat.of().parseHex(fixture.secret()))).compact();
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/auth/me").header("Authorization","Bearer "+old))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
            String wrong=Jwts.builder().setSubject("jwt-test").claim("userId",8L)
                    .setExpiration(new java.util.Date(System.currentTimeMillis()+60000))
                    .signWith(Keys.hmacShaKeyFor(HexFormat.of().parseHex(fixture.secret()))).compact();
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/auth/me").header("Authorization","Bearer "+wrong))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
            fixture.user().setIsActive(false);
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/auth/me").header("Authorization","Bearer "+old))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
            fixture.user().setIsActive(true);fixture.user().setTokenVersion(1L);
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/auth/me").header("Authorization","Bearer "+old))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
        }
    }

    @Test
    void controlledRotationRejectsOldTokenAndAcceptsNewToken() {
        String secretA = randomSecret();
        String secretB = randomSecret();

        contextRunner().withPropertyValues("JWT_SECRET=" + secretA).run(first -> {
            JwtTokenProvider providerA = first.getBean(JwtTokenProvider.class);
            String tokenA = providerA.generateToken(authentication());
            assertThat(providerA.validateToken(tokenA)).isTrue();
            contextRunner().withPropertyValues("JWT_SECRET=" + secretB).run(second -> {
                JwtTokenProvider providerB = second.getBean(JwtTokenProvider.class);
                assertThat(providerB.validateToken(tokenA)).isFalse();
                assertThat(providerB.validateToken(providerB.generateToken(authentication()))).isTrue();
            });
        });
    }

    private ApplicationContextRunner contextRunner() {
        return new ApplicationContextRunner().withInitializer(context -> {
            var sources = context.getEnvironment().getPropertySources();
            sources.remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
            sources.remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
            try {
                new YamlPropertySourceLoader().load("actual-application", new ClassPathResource("application.yml"))
                        .forEach(sources::addLast);
            } catch (IOException exception) {
                throw new IllegalStateException("Cannot load application configuration", exception);
            }
        }).withBean(PropertySourcesPlaceholderConfigurer.class).withUserConfiguration(JwtTokenProvider.class);
    }

    private Authentication authentication() {
        User user = User.builder().id(7L).username("jwt-test").email("jwt-test@example.invalid")
                .role(Role.ROLE_USER).isActive(true).build();
        return new UsernamePasswordAuthenticationToken(new CustomUserDetails(user), null);
    }

    private String randomSecret() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }
}
