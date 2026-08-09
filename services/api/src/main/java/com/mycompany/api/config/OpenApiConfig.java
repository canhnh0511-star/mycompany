package com.mycompany.api.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Metadata + JWT Bearer security scheme cho Swagger UI (docs/TASKS.md Phase 5). Swagger UI tự bị tắt
 * hẳn ở profile {@code prod} qua {@code application-prod.yml} (springdoc.api-docs.enabled=false,
 * springdoc.swagger-ui.enabled=false) — không cần logic gate thủ công trong class này.
 *
 * <p>Đăng nhập trước qua {@code POST /api/v1/auth/login} lấy {@code accessToken}, rồi bấm nút
 * "Authorize" trên Swagger UI, dán token vào (không cần gõ tiền tố {@code Bearer }, springdoc tự
 * thêm) — mọi request thử nghiệm sau đó tự động kèm header {@code Authorization}.
 *
 * <p>Chi tiết luồng nghiệp vụ (OCR end-to-end, batch contract, quy ước lỗi...) không nằm ở đây — xem
 * {@code docs/api.md}, Swagger UI chỉ mô tả shape từng endpoint.
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME_NAME = "bearerAuth";

    @Bean
    public OpenAPI openApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Module 1 — Chi phí / Sản lượng API")
                        .description(
                                "REST API cho hệ thống số hóa chi phí/sản lượng trại cạo mủ cao su "
                                        + "(Module 1). Xem docs/api.md cho luồng nghiệp vụ (OCR, batch, "
                                        + "auth, quy ước lỗi) — tài liệu này chỉ mô tả shape endpoint.")
                        .version("v1"))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME_NAME))
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME_NAME, new SecurityScheme()
                                .name(BEARER_SCHEME_NAME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
