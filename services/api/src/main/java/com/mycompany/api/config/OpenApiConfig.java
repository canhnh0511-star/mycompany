package com.mycompany.api.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Metadata cho Swagger UI/OpenAPI (docs/TASKS.md Phase 5) — khai báo scheme Bearer JWT để "Authorize"
 * trên Swagger UI gửi kèm header Authorization đúng định dạng API dùng thật (ADR-0004: chỉ access
 * token, không refresh token). Bật/tắt springdoc theo profile ở application.yml/application-prod.yml,
 * không xử lý ở đây.
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI apiOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Module 1 — Chi phí / Sản lượng API")
                        .description("Số hóa quản lý chi phí/sản lượng trại cạo mủ cao su. "
                                + "Chi tiết luồng nghiệp vụ không diễn tả hết ở đây: xem docs/api.md.")
                        .version("v1"))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME))
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                                .name(BEARER_SCHEME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
