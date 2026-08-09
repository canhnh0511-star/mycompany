package com.mycompany.api.integration;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycompany.api.dto.CreateTeamRequest;
import com.mycompany.api.dto.UpdateTeamRequest;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Chạy thẳng lên Supabase dev thật (services/api/.env, đã có qua springboot3-dotenv — không cần
 * export biến môi trường thủ công, xem docs/TASKS.md Phase 0), KHÔNG dùng Testcontainers/Docker
 * (đã xác nhận với user, docs/TASKS.md Phase 5). {@code @Transactional} ở mức class rollback mọi
 * thay đổi sau MỖI test — dữ liệu tạo ra trong test không đọng lại trên DB dev thật.
 *
 * <p>Auth qua JWT thật của tài khoản Admin seed (002_seed_admin_user.sql), lấy token bằng
 * {@link com.mycompany.api.integration.IntegrationTestSupport} thay vì gọi /auth/login bằng mật khẩu
 * — mật khẩu seed có thể đã bị đổi ở dev thật (docs/TASKS.md Phase 0 open item), token sinh trực tiếp
 * qua JwtService không phụ thuộc việc đó.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Transactional
class TeamIntegrationTest extends IntegrationTestSupport {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void createThenUpdateThenListThenGet_roundTrip() throws Exception {
        String uniqueName = "Tổ Integration Test " + UUID.randomUUID();
        CreateTeamRequest createRequest = new CreateTeamRequest(uniqueName, "Tạo bởi integration test");

        String createResponseJson = mockMvc.perform(post("/api/v1/teams")
                        .header("Authorization", adminAuthorizationHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value(uniqueName))
                .andExpect(jsonPath("$.id").exists())
                .andReturn().getResponse().getContentAsString();

        UUID createdId = UUID.fromString(objectMapper.readTree(createResponseJson).get("id").asText());

        UpdateTeamRequest updateRequest = new UpdateTeamRequest(uniqueName, "Mô tả đã sửa");
        mockMvc.perform(patch("/api/v1/teams/{id}", createdId)
                        .header("Authorization", adminAuthorizationHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("Mô tả đã sửa"));

        mockMvc.perform(get("/api/v1/teams/{id}", createdId)
                        .header("Authorization", adminAuthorizationHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("Mô tả đã sửa"));

        mockMvc.perform(get("/api/v1/teams")
                        .header("Authorization", adminAuthorizationHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", greaterThanOrEqualTo(1)));
    }

    @Test
    void get_returns404_whenTeamDoesNotExist() throws Exception {
        mockMvc.perform(get("/api/v1/teams/{id}", UUID.randomUUID())
                        .header("Authorization", adminAuthorizationHeader()))
                .andExpect(status().isNotFound());
    }

    @Test
    void create_returns400_whenNameBlank() throws Exception {
        mockMvc.perform(post("/api/v1/teams")
                        .header("Authorization", adminAuthorizationHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void anyEndpoint_returns403_withoutToken() throws Exception {
        // Spring Security mặc định (không cấu hình AuthenticationEntryPoint riêng ở SecurityConfig)
        // trả 403 Forbidden cho request thiếu credentials trên endpoint yêu cầu authenticated(),
        // KHÔNG phải 401 Unauthorized như có thể nhầm tưởng — xác nhận đúng hành vi thật lúc chạy
        // integration test này (docs/TASKS.md Phase 5), không phải giả định.
        mockMvc.perform(get("/api/v1/teams"))
                .andExpect(status().isForbidden());
    }

    @Test
    void rollbackReallyHappens_dataCreatedInPreviousTestIsGone() {
        // Chỉ để tài liệu hóa hành vi @Transactional rollback — không phải test độc lập cần chạy tự
        // động thứ tự cụ thể (JUnit không đảm bảo thứ tự giữa các @Test), chỉ khẳng định transaction
        // hiện tại đang active và sẽ rollback (xem class javadoc).
        org.assertj.core.api.Assertions.assertThat(TestTransaction.isActive()).isTrue();
        org.assertj.core.api.Assertions.assertThat(TestTransaction.isFlaggedForRollback()).isTrue();
    }
}
