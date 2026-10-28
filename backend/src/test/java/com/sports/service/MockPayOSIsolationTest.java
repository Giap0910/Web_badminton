package com.sports.service;

import com.sports.WebBadmintonApplication;
import com.sports.config.PayOSModeConfig;
import com.sports.mockpayos.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.context.event.ApplicationPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;

class MockPayOSIsolationTest {
    static MockEnvironment allowed() {
        var env=new MockEnvironment().withProperty("payos.mode","MOCK").withProperty("server.address","127.0.0.1")
                .withProperty("spring.datasource.url","jdbc:mysql://127.0.0.1:3306/web_badminton_mock_unit")
                .withProperty("spring.datasource.username","mock_app").withProperty("payos.mock-database","web_badminton_mock_unit")
                .withProperty("app.jwt.secret","2".repeat(64)).withProperty("payos.mock-jwt-secret","2".repeat(64))
                .withProperty("spring.jpa.hibernate.ddl-auto","validate").withProperty("spring.sql.init.mode","never");
        env.setActiveProfiles("test","mock-payos"); return env;
    }

    @Test void permitsOnlyExplicitMockConfiguration() { assertEquals("MOCK",PayOSModeConfig.validateConfiguration(allowed())); }

    @ParameterizedTest @ValueSource(strings={"root","pma",""})
    void refusesGlobalOrMissingCredentials(String user) {
        assertThrows(IllegalStateException.class,()->PayOSModeConfig.validateConfiguration(allowed().withProperty("spring.datasource.username",user)));
    }

    @ParameterizedTest @ValueSource(strings={"update","create","create-drop","none"})
    void refusesAutomaticDomainDdl(String value) {
        assertThrows(IllegalStateException.class,()->PayOSModeConfig.validateConfiguration(allowed().withProperty("spring.jpa.hibernate.ddl-auto",value)));
    }

    @ParameterizedTest @ValueSource(strings={"prod","production"})
    void productionCannotEnableMock(String profile) {
        var env=allowed(); env.setActiveProfiles("test","mock-payos",profile);
        assertThrows(IllegalStateException.class,()->PayOSModeConfig.validateConfiguration(env));
    }

    @ParameterizedTest @ValueSource(strings={"client-id","api-key","checksum-key"})
    void mockRejectsRealPaymentCredentials(String field) {
        assertThrows(IllegalStateException.class,()->PayOSModeConfig.validateConfiguration(allowed().withProperty("payos."+field,"fixture-real-secret")));
    }

    @ParameterizedTest @ValueSource(strings={"jdbc:mysql://localhost:3306/web_badminton","jdbc:mysql://remote.invalid:3306/web_badminton_mock_unit",
            "jdbc:mysql://localhost:3306/web_badminton_mock_unit?user=root","jdbc:mysql://root@localhost:3306/web_badminton_mock_unit"})
    void unsafeDatasourceFailsClosed(String url) {
        assertThrows(IllegalStateException.class,()->PayOSModeConfig.validateConfiguration(allowed().withProperty("spring.datasource.url",url)));
    }

    @Test void realCanUseRemoteDatasourceButNeverMockSchema() {
        assertEquals("REAL",PayOSModeConfig.validateConfiguration(new MockEnvironment()
                .withProperty("spring.datasource.url","jdbc:mysql://db.example.invalid:3306/shop")));
        assertThrows(IllegalStateException.class,()->PayOSModeConfig.validateConfiguration(new MockEnvironment()
                .withProperty("spring.datasource.url","jdbc:mysql://localhost:3306/web_badminton_mock_unit")));
    }

    @ParameterizedTest @ValueSource(strings={"GRANT ALL PRIVILEGES ON *.* TO `test`@`localhost`",
            "GRANT SELECT ON `web_badminton`.* TO `test`@`localhost`","GRANT ALL ON `web_badminton_mock_unit`.* TO `test`@`localhost` WITH GRANT OPTION"})
    void grantValidationRejectsGlobalCrossSchemaAndDelegation(String grant) {
        assertThrows(IllegalStateException.class,()->PayOSModeConfig.validateGrant(grant,"web_badminton_mock_unit"));
    }

    @Test void schemaOnlyGrantsAreAccepted() {
        assertDoesNotThrow(()->PayOSModeConfig.validateGrant("GRANT USAGE ON *.* TO `mock`@`localhost`","web_badminton_mock_unit"));
        assertDoesNotThrow(()->PayOSModeConfig.validateGrant("GRANT ALL PRIVILEGES ON `web\\_badminton\\_mock\\_unit`.* TO `mock`@`localhost`","web_badminton_mock_unit"));
    }

    @ParameterizedTest @ValueSource(strings={"test","test_shared","web_badminton","another_database"})
    void implicitExtraSchemasAreRejectedEvenWhenExplicitGrantsAreScoped(String visible) {
        assertThrows(IllegalStateException.class,()->PayOSModeConfig.validateVisibleSchema(visible,"web_badminton_mock_unit"));
    }

    @ParameterizedTest @ValueSource(strings={"web_badminton_mock_unit","information_schema","performance_schema"})
    void onlyOwnedSchemaAndReadOnlySystemMetadataAreVisible(String visible) {
        assertDoesNotThrow(()->PayOSModeConfig.validateVisibleSchema(visible,"web_badminton_mock_unit"));
    }

    @Test void realDoesNotRegisterMockProviderOrControllers() {
        new ApplicationContextRunner().withUserConfiguration(MockPayOSProvider.class,MockPayOSController.class,
                MockPayOSPersistenceConfig.class,MockPayOSLegacyController.class).run(context->{
                    assertFalse(context.containsBean("mockPayOSProvider")); assertFalse(context.containsBean("mockPayOSController"));
                    assertFalse(context.containsBean("mockPayOSPersistenceConfig")); assertFalse(context.containsBean("mockPayOSLegacyController"));
                });
    }

    @Test void environmentPostProcessorRefusesStartupBeforeContextJpaAndInitializers() {
        var prepared=new AtomicInteger();
        var app=new SpringApplication(WebBadmintonApplication.class); app.setWebApplicationType(WebApplicationType.NONE);
        app.addListeners((ApplicationListener<ApplicationPreparedEvent>)event->prepared.incrementAndGet());
        assertThrows(IllegalStateException.class,()->app.run("--spring.profiles.active=test,mock-payos",
                "--payos.mode=MOCK","--payos.mock-database=web_badminton_mock_unit",
                "--spring.datasource.url=jdbc:mysql://127.0.0.1:3306/web_badminton",
                "--spring.datasource.username=mock_app","--app.jwt.secret=MOCK_ONLY_fixture_key_abcdefghijklmnopqrstuvwxyz"));
        assertEquals(0,prepared.get());
    }
}
