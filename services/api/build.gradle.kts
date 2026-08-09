plugins {
    java
    id("org.springframework.boot") version "3.3.5"
    id("io.spring.dependency-management") version "1.1.6"
}

// TODO: đổi group theo tên/domain công ty thật khi có (hiện là placeholder — xem CLAUDE.md §3)
group = "com.mycompany"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

repositories {
    mavenCentral()
}

val jjwtVersion = "0.12.6"

dependencies {
    // Tự nạp services/api/.env vào Spring Environment lúc khởi động (kể cả ./gradlew bootRun lẫn
    // IDE run config) — chốt Open Question ở docs/TASKS.md Phase 0 (trước đó phải export biến môi
    // trường thủ công, dễ quên khi dev máy mới hoặc đổi biến giữa chừng).
    implementation("me.paulschwarz:springboot3-dotenv:5.0.1")

    // Web + validation
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")

    // Health check endpoint (/actuator/health) — dùng cho deploy platform health checks (CLAUDE.md §7);
    // đã được permitAll ở SecurityConfig nên cần dependency này để endpoint thực sự tồn tại.
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    // Persistence
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    runtimeOnly("org.postgresql:postgresql")

    // Security — chỉ dùng cho BCryptPasswordEncoder + filter chain hạ tầng; auth tự triển khai
    // bằng JWT thủ công (xem docs/adr/0004-auth-simplified-for-v1.md), không dùng OAuth2/Basic.
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("io.jsonwebtoken:jjwt-api:$jjwtVersion")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:$jjwtVersion")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:$jjwtVersion")

    // Logging — JSON structured logs ra stdout (xem docs/adr/0008-logging-conventions.md)
    implementation("net.logstash.logback:logstash-logback-encoder:8.0")

    // Tự sinh Swagger UI/OpenAPI (docs/TASKS.md Phase 5) — chặn hoàn toàn ở profile "prod"
    // (application-prod.yml), chỉ bật ở dev/local; kể cả khi bật vẫn nằm sau JWT auth (SecurityConfig
    // không permitAll đường dẫn springdoc) — xem Open Question "Swagger UI mở ở profile nào" đã resolve.
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0")

    // Xuất báo cáo (docs/TASKS.md Phase 4) — sinh ở backend, đảm bảo nhất quán web/app (CLAUDE.md §3).
    // openpdf dùng package org.openpdf.text.* (đổi từ com.lowagie.text.* ở bản cũ) — PdfReportExportService
    // phải tự nhúng font Unicode (src/main/resources/fonts/NotoSans-Regular.ttf) vì font mặc định không
    // có dấu tiếng Việt.
    implementation("org.apache.poi:poi-ooxml:5.5.1")
    implementation("com.github.librepdf:openpdf:3.0.5")

    // Tự sinh Swagger UI / OpenAPI spec từ controller + DTO có sẵn (docs/TASKS.md Phase 5). Chặn ở
    // profile prod qua application-prod.yml (springdoc.*.enabled=false) — xem OpenApiConfig.java.
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0")

    // Boilerplate reduction
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
