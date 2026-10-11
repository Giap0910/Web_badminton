package com.sports;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@org.springframework.boot.autoconfigure.domain.EntityScan("com.sports.entity")
@org.springframework.data.jpa.repository.config.EnableJpaRepositories("com.sports.repository")
@EnableScheduling
public class WebBadmintonApplication {

    public static void main(String[] args) {
        SpringApplication.run(WebBadmintonApplication.class, args);
    }
}
