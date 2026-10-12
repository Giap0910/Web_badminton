package com.sports.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    @Value("${app.cors.allowed-origins:http://localhost:5173,http://127.0.0.1:5173}")
    private String allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, exception) -> writeSecurityError(request, response, 401))
                .accessDeniedHandler((request, response, exception) -> writeSecurityError(request, response, 403)))
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/register").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/categories/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/administrative-units/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/media/avatars/**").permitAll()
                .requestMatchers("/api/comparison/**").permitAll()
                .requestMatchers("/api/ai-chat/**").permitAll()
                .requestMatchers("/api/payment/payos-webhook").permitAll()
                .requestMatchers("/api/payment/mock-webhook-trigger").hasAuthority("ROLE_ADMIN")
                .requestMatchers("/api/dev/mock-payos/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/payment/environment").hasAnyAuthority("ROLE_USER", "ROLE_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/reviews/product/**").permitAll()

                // Admin only
                .requestMatchers("/api/admin/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/products/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/products/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/products/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/categories/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/categories/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/categories/**").hasAuthority("ROLE_ADMIN")

                // Authenticated users
                .requestMatchers("/api/orders/**").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/reviews/**").authenticated()

                .anyRequest().authenticated()
            );

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.stream(allowedOrigins.split(","))
                .map(String::trim).filter(origin -> !origin.isEmpty()).toList());
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "Idempotency-Key"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private void writeCheckoutSecurityError(jakarta.servlet.http.HttpServletRequest request,
            jakarta.servlet.http.HttpServletResponse response, int status) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        var body = java.util.Map.of("timestamp", java.time.OffsetDateTime.now().toString(), "status", status,
                "code", status == 401 ? "UNAUTHENTICATED" : "NOT_ORDER_OWNER", "message", "Không có quyền truy cập",
                "path", request.getRequestURI(), "errors", java.util.Map.of());
        new com.fasterxml.jackson.databind.ObjectMapper().writeValue(response.getWriter(), body);
    }

    private void writeSecurityError(jakarta.servlet.http.HttpServletRequest request,
            jakarta.servlet.http.HttpServletResponse response, int status)
            throws java.io.IOException {
        if (request.getRequestURI().equals("/api/payment/environment") || request.getRequestURI().startsWith("/api/dev/mock-payos/")) {
            writeMockSecurityError(request,response,status);
            return;
        }
        if (request.getRequestURI().matches("/api/orders/[^/]+/(checkout-context|payment-method-transitions)")) {
            writeCheckoutSecurityError(request, response, status);
            return;
        }
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        String message = status == 401 ? "Phiên đăng nhập không hợp lệ" : "Bạn không có quyền truy cập";
        response.getWriter().write("{\"status\":" + status + ",\"message\":\"" + message + "\"}");
    }

    private void writeMockSecurityError(jakarta.servlet.http.HttpServletRequest request,
            jakarta.servlet.http.HttpServletResponse response,int status) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        new com.fasterxml.jackson.databind.ObjectMapper().writeValue(response.getWriter(), java.util.Map.of(
                "timestamp", java.time.OffsetDateTime.now().toString(), "status", status,
                "code", status == 401 ? "UNAUTHENTICATED" : "FORBIDDEN", "message", "Không có quyền truy cập",
                "path", request.getRequestURI(), "errors", java.util.Map.of()));
    }
}
