package com.sports.mockpayos;

import org.springframework.context.annotation.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import javax.sql.DataSource;

@Configuration @Profile("mock-payos")
@ConditionalOnProperty(name="payos.mock-verified",havingValue="true")
@EntityScan(basePackages={"com.sports.entity","com.sports.mockpayos"})
@EnableJpaRepositories("com.sports.mockpayos")
public class MockPayOSPersistenceConfig {
    @Bean public static BeanFactoryPostProcessor mockSchemaBeforeJpa() {
        return factory -> {
            if (factory.containsBeanDefinition("entityManagerFactory")) {
                factory.getBeanDefinition("entityManagerFactory").setDependsOn("mockPayOSSchema");
            }
        };
    }

    @Bean public Object mockPayOSSchema(DataSource dataSource) throws java.sql.SQLException {
        try (var connection=dataSource.getConnection()) {
            MockPayOSSchema.initialize(connection);
        }
        return new Object();
    }
}
