package com.mycompany.api.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycompany.api.config.JwtService;
import com.mycompany.api.dto.UpdateProfileRequest;
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

/** PATCH /users/me — cập nhật hồ sơ, gồm SĐT mới (docs/plans/0022-profile-8-screens-plan.md). */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Transactional
class UserIntegrationTest extends IntegrationTestSupport {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtService jwtService;

    private User createUser(String phone) {
        return userRepository.save(User.builder()
                .fullName("Test User " + UUID.randomUUID())
                .email("user-" + UUID.randomUUID() + "@example.com")
                .phone(phone)
                .passwordHash(passwordEncoder.encode("x"))
                .role(UserRole.ADMIN)
                .isActive(true)
                .build());
    }

    private String authHeaderFor(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }

    @Test
    void updateMe_setsPhone_succeeds() throws Exception {
        User user = createUser(null);
        String newPhone = "0987" + (100000 + (int) (Math.random() * 899999));

        mockMvc.perform(patch("/api/v1/users/me")
                        .header("Authorization", authHeaderFor(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateProfileRequest(user.getFullName(), null, null, newPhone))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value(newPhone));
    }

    @Test
    void updateMe_returns409_whenPhoneAlreadyUsedByAnotherUser() throws Exception {
        String takenPhone = "0977" + (100000 + (int) (Math.random() * 899999));
        createUser(takenPhone);
        User other = createUser(null);

        mockMvc.perform(patch("/api/v1/users/me")
                        .header("Authorization", authHeaderFor(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateProfileRequest(other.getFullName(), null, null, takenPhone))))
                .andExpect(status().isConflict());
    }

    @Test
    void updateMe_returns400_whenPhoneFormatInvalid() throws Exception {
        User user = createUser(null);

        mockMvc.perform(patch("/api/v1/users/me")
                        .header("Authorization", authHeaderFor(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateProfileRequest(user.getFullName(), null, null, "abc"))))
                .andExpect(status().isBadRequest());
    }
}
