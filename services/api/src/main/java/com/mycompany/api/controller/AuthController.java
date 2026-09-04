package com.mycompany.api.controller;

import com.mycompany.api.config.JwtService;
import com.mycompany.api.dto.LoginRequest;
import com.mycompany.api.dto.LoginResponse;
import com.mycompany.api.entity.User;
import com.mycompany.api.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Không có endpoint đăng ký công khai — tài khoản Admin seed sẵn qua migration
 * (docs/adr/0004-auth-simplified-for-v1.md). Token trả về là access token duy nhất, hết hạn theo
 * app.jwt.expiration-ms, không có refresh token.
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private static final String INVALID_CREDENTIALS_MESSAGE = "Email/Số điện thoại hoặc mật khẩu không đúng";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        // request.email() là identifier chung (mục "API còn thiếu #1",
        // docs/plans/0022-profile-8-screens-plan.md) — thử email trước (đa số tài khoản cũ), không thấy
        // thử phone (màn đăng nhập mới của mobile gửi SĐT qua đúng key này).
        User user = userRepository.findByEmail(request.email())
                .or(() -> userRepository.findByPhone(request.email()))
                .filter(User::isActive)
                .orElseThrow(() -> new BadCredentialsException(INVALID_CREDENTIALS_MESSAGE));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException(INVALID_CREDENTIALS_MESSAGE);
        }

        log.info("User {} đăng nhập thành công", user.getId());
        String token = jwtService.generateToken(user);
        return new LoginResponse(token, user.getId(), user.getFullName(), user.getRole().name());
    }
}
