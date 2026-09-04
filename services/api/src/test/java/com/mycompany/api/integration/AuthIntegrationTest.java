package com.mycompany.api.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycompany.api.dto.LoginRequest;
import com.mycompany.api.entity.User;
import com.mycompany.api.entity.UserRole;
import com.mycompany.api.repository.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Đăng nhập bằng email HOẶC số điện thoại (docs/plans/0022-profile-8-screens-plan.md, mục
 * "API còn thiếu #1"). Không dùng tài khoản Admin seed để test mật khẩu (có thể đã bị đổi ở dev thật,
 * xem {@link IntegrationTestSupport}) — tạo user riêng trong mỗi test, mật khẩu biết trước.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Transactional
class AuthIntegrationTest extends IntegrationTestSupport {

    private static final String RAW_PASSWORD = "MatKhau123";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    private User createUser(String email, String phone) {
        return userRepository.save(User.builder()
                .fullName("Test User " + UUID.randomUUID())
                .email(email)
                .phone(phone)
                .passwordHash(passwordEncoder.encode(RAW_PASSWORD))
                .role(UserRole.ADMIN)
                .isActive(true)
                .build());
    }

    @Test
    void login_succeedsWithEmail_existingBehaviorUnaffected() throws Exception {
        String email = "email-login-" + UUID.randomUUID() + "@example.com";
        createUser(email, null);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, RAW_PASSWORD))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists());
    }

    @Test
    void login_succeedsWithPhone() throws Exception {
        String phone = "0912" + (100000 + (int) (Math.random() * 899999));
        createUser("phone-login-" + UUID.randomUUID() + "@example.com", phone);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(phone, RAW_PASSWORD))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists());
    }

    @Test
    void login_returns401_whenIdentifierNotFound() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest("0900000000", RAW_PASSWORD))))
                .andExpect(status().isUnauthorized());
    }
}
