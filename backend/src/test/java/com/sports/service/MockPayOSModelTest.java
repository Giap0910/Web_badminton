package com.sports.service;

import jakarta.persistence.Entity;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import static org.junit.jupiter.api.Assertions.*;

class MockPayOSModelTest {
    @Test void hibernateBuildsDomainAndMockModelsWithoutAnyJdbcConnection() throws Exception {
        var registry=new StandardServiceRegistryBuilder().applySetting("hibernate.dialect","org.hibernate.dialect.MySQLDialect")
                .applySetting("hibernate.temp.use_jdbc_metadata_defaults","false").applySetting("hibernate.hbm2ddl.auto","none")
                .applySetting("hibernate.connection.provider_class","org.hibernate.engine.jdbc.connections.internal.UserSuppliedConnectionProviderImpl").build();
        try {
            var sources=new MetadataSources(registry);
            var scanner=new ClassPathScanningCandidateComponentProvider(false);scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));
            for(var definition:scanner.findCandidateComponents("com.sports")) sources.addAnnotatedClass(Class.forName(definition.getBeanClassName()));
            var metadata=sources.getMetadataBuilder().applyPhysicalNamingStrategy(new org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy()).build();
            assertEquals("mock_payos_state",metadata.getEntityBinding("com.sports.mockpayos.MockPayOSState").getTable().getName());
            assertEquals("mock_payos_actions",metadata.getEntityBinding("com.sports.mockpayos.MockPayOSAction").getTable().getName());
            try(var factory=metadata.buildSessionFactory()) { assertTrue(factory.isOpen()); }
        }finally{StandardServiceRegistryBuilder.destroy(registry);}
    }
}
