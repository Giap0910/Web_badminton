package com.sports;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class WebBadmintonApplication {

    public static void main(String[] args) {
        SpringApplication.run(WebBadmintonApplication.class, args);
    }
}
