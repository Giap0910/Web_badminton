package com.sports.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import java.net.URI;
import java.sql.*;
import java.util.*;

public final class PayOSModeConfig implements EnvironmentPostProcessor, Ordered {
    private static final Set<String> LOOPBACK = Set.of("localhost", "127.0.0.1", "::1");

    @Override public int getOrder() { return ConfigDataEnvironmentPostProcessor.ORDER + 100; }

    @Override public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication application) {
        String mode = validateConfiguration(env);
        if (!"MOCK".equals(mode)) return;
        verifyDatabase(env);
        byte[] bytes = new byte[32];
        new java.security.SecureRandom().nextBytes(bytes);
        env.getPropertySources().addFirst(new MapPropertySource("verifiedMockPayOS", Map.of(
                "payos.mock-verified", "true", "payos.mock-signing-key", HexFormat.of().formatHex(bytes))));
    }

    public static String validateConfiguration(ConfigurableEnvironment env) {
        String mode = env.getProperty("payos.mode", "REAL");
        Set<String> profiles = Set.of(env.getActiveProfiles());
        if (!Set.of("REAL", "MOCK").contains(mode)) throw rejected();
        if ("REAL".equals(mode)) {
            if (profiles.contains("mock-payos") || database(env).startsWith("web_badminton_mock_")) throw rejected();
            return mode;
        }
        validateProfiles(profiles);
        validateMockSettings(env);
        return mode;
    }

    private static void validateProfiles(Set<String> profiles) {
        if (!profiles.contains("mock-payos") || Collections.disjoint(profiles, Set.of("dev", "test"))
                || !Collections.disjoint(profiles, Set.of("prod", "production"))) throw rejected();
    }

    private static void validateMockSettings(ConfigurableEnvironment env) {
        String schema = env.getProperty("payos.mock-database", "");
        if (!schema.matches("web_badminton_mock_[a-zA-Z0-9_]{1,40}") || !schema.equals(database(env))) throw rejected();
        if (!LOOPBACK.contains(env.getProperty("server.address", ""))) throw rejected();
        String user = env.getProperty("spring.datasource.username", "");
        if (user.isBlank() || Set.of("root", "pma").contains(user.toLowerCase(Locale.ROOT))) throw rejected();
        for (String key : List.of("client-id", "api-key", "checksum-key")) {
            if (!env.getProperty("payos." + key, "").isBlank()) throw rejected();
        }
        String jwt=env.getProperty("payos.mock-jwt-secret", "");
        if (!jwt.matches("[0-9a-fA-F]{64,}") || jwt.length()%2!=0 || !jwt.equals(env.getProperty("app.jwt.secret", ""))) throw rejected();
        if (!"validate".equals(env.getProperty("spring.jpa.hibernate.ddl-auto", ""))
                || !"never".equals(env.getProperty("spring.sql.init.mode", ""))) throw rejected();
    }

    private static String database(ConfigurableEnvironment env) {
        String url = env.getProperty("spring.datasource.url", "");
        if (url.isBlank() && "REAL".equals(env.getProperty("payos.mode", "REAL"))) return "";
        try {
            URI uri = URI.create(url.substring("jdbc:".length()));
            if (!url.startsWith("jdbc:mysql://") || uri.getHost() == null
                    || "MOCK".equals(env.getProperty("payos.mode")) && !LOOPBACK.contains(uri.getHost())
                    || uri.getUserInfo() != null || uri.getFragment() != null) throw rejected();
            if ("MOCK".equals(env.getProperty("payos.mode"))) validateOptions(uri.getRawQuery());
            return uri.getPath().substring(1);
        } catch (RuntimeException ex) { throw rejected(); }
    }

    private static void validateOptions(String query) {
        if (query==null) return;
        Set<String> allowed=Set.of("useSSL","characterEncoding","serverTimezone","allowPublicKeyRetrieval","connectTimeout","socketTimeout");
        for (String option:query.split("&")) {
            String[] pair=option.split("=",2);
            if (pair.length!=2 || !allowed.contains(pair[0]) || !pair[1].matches("[a-zA-Z0-9_/:+.-]{1,80}")) throw rejected();
        }
    }

    private static void verifyDatabase(ConfigurableEnvironment env) {
        Properties properties = new Properties();
        properties.setProperty("user", env.getRequiredProperty("spring.datasource.username"));
        properties.setProperty("password", env.getProperty("spring.datasource.password", ""));
        properties.setProperty("connectTimeout", "3000");
        properties.setProperty("socketTimeout", "3000");
        try (Connection connection = DriverManager.getConnection(env.getRequiredProperty("spring.datasource.url"), properties)) {
            connection.setReadOnly(true);
            requireIdentity(connection, env.getRequiredProperty("payos.mock-database"));
            requireGrants(connection, env.getRequiredProperty("payos.mock-database"));
            requireVisibleSchemas(connection, env.getRequiredProperty("payos.mock-database"));
            requireMockHistory(connection);
        } catch (SQLException ex) { throw rejected(); }
    }

    private static void requireIdentity(Connection connection, String schema) throws SQLException {
        try (var statement = connection.createStatement(); var rows = statement.executeQuery("SELECT DATABASE(), CURRENT_USER()")) {
            if (!rows.next() || !schema.equals(rows.getString(1)) || rows.getString(2).startsWith("root@")) throw rejected();
        }
    }

    public static void validateGrant(String grant, String schema) {
        String normalized = grant.replace("\\_", "_");
        if (normalized.startsWith("GRANT USAGE ON *.* TO ") && !normalized.contains("WITH GRANT OPTION")) return;
        if (!normalized.contains(" ON `" + schema + "`.* TO ") || normalized.contains("WITH GRANT OPTION")) throw rejected();
    }

    private static void requireGrants(Connection connection, String schema) throws SQLException {
        try (var statement = connection.createStatement(); var rows = statement.executeQuery("SHOW GRANTS FOR CURRENT_USER()")) {
            boolean found = false;
            while (rows.next()) { validateGrant(rows.getString(1), schema); found = true; }
            if (!found) throw rejected();
        }
    }

    public static void validateVisibleSchema(String visible, String schema) {
        if (!Set.of(schema, "information_schema", "performance_schema").contains(visible)) throw rejected();
    }

    private static void requireVisibleSchemas(Connection connection, String schema) throws SQLException {
        try (var statement = connection.createStatement(); var rows = statement.executeQuery("SHOW DATABASES")) {
            while (rows.next()) validateVisibleSchema(rows.getString(1), schema);
        }
    }

    private static void requireMockHistory(Connection connection) throws SQLException {
        validateHistory(connection,"payment_attempts");
        validateHistory(connection,"payment_events");
    }

    private static void validateHistory(Connection connection,String table) throws SQLException {
        var metadata = connection.getMetaData();
        try (var tables = metadata.getTables(connection.getCatalog(), null, table, new String[]{"TABLE"})) {
            if (!tables.next()) return;
        }
        try (var statement = connection.createStatement(); var rows = statement.executeQuery(
                "SELECT payment_link_id, reference FROM "+table+" WHERE provider = 'PAYOS'")) {
            while (rows.next()) {
                if (rows.getString(1) != null && !rows.getString(1).startsWith("MOCK_LINK_")) throw rejected();
                if (rows.getString(2) != null && !rows.getString(2).startsWith("MOCK_REF_")) throw rejected();
            }
        }
    }

    private static IllegalStateException rejected() {
        return new IllegalStateException("FIX-058: môi trường PayOS không an toàn; không khởi tạo database hoặc provider");
    }
}
