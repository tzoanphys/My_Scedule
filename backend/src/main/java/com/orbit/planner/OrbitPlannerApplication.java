package com.orbit.planner;

import com.orbit.planner.service.DiaryMigration;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class OrbitPlannerApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrbitPlannerApplication.class, args);
    }

    @Bean
    ApplicationRunner prepare(DiaryMigration migration) {
        return args -> migration.copyLegacyIfNeeded();
    }
}
