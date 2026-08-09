package com.mycompany.api.integration;

import com.mycompany.api.config.JwtService;
import com.mycompany.api.entity.User;
import com.mycompany.api.repository.UserRepository;
import java.util.NoSuchElementException;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Base class dùng chung cho integration test chạy lên Supabase dev thật (docs/TASKS.md Phase 5).
 * Sinh JWT thật của tài khoản Admin seed (002_seed_admin_user.sql) qua {@link JwtService} — KHÔNG
 * gọi /auth/login bằng mật khẩu vì mật khẩu seed có thể đã bị đổi ở dev thật.
 */
abstract class IntegrationTestSupport {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private JwtService jwtService;

    protected User adminUser() {
        return userRepository.findByEmail("admin@mycompany.local")
                .orElseThrow(() -> new NoSuchElementException(
                        "Không tìm thấy Admin seed (admin@mycompany.local) — kiểm tra migration 002 đã chạy trên DB test"));
    }

    protected String adminAuthorizationHeader() {
        return "Bearer " + jwtService.generateToken(adminUser());
    }
}
