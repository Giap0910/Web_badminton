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
            assertThat(parsed.getBody().getExpiration().getTime() - parsed.getBody().getIssuedAt().getTime())
                    .isEqualTo(86400000L);
            assertThat(output.getAll()).doesNotContain(secret, token);
        });
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
