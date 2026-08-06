package com.mycompany.api.controller;

import com.mycompany.api.dto.UpdateProfileRequest;
import com.mycompany.api.dto.UserProfileResponse;
import com.mycompany.api.entity.User;
import com.mycompany.api.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * /me — hồ sơ cá nhân của chính người đang đăng nhập. Chỉ sửa được tên/avatar/chức vụ (không tự đổi
 * email/mật khẩu/role qua đây). Thêm Admin mới là API nội bộ khác, không phải self-service — xem
 * docs/adr/0004-auth-simplified-for-v1.md.
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/me")
    public UserProfileResponse me(@AuthenticationPrincipal User currentUser) {
        return toResponse(currentUser);
    }

    @PatchMapping("/me")
    public UserProfileResponse updateMe(@AuthenticationPrincipal User currentUser,
            @Valid @RequestBody UpdateProfileRequest request) {
        currentUser.setFullName(request.fullName());
        currentUser.setAvatarUrl(request.avatarUrl());
        currentUser.setPosition(request.position());
        User saved = userRepository.save(currentUser);
        return toResponse(saved);
    }

    private UserProfileResponse toResponse(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole().name(),
                user.getAvatarUrl(),
                user.getPosition());
    }
}
