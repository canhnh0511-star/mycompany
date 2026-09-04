package com.mycompany.api.controller;

import com.mycompany.api.dto.ChangePasswordRequest;
import com.mycompany.api.dto.UpdateProfileRequest;
import com.mycompany.api.dto.UserProfileResponse;
import com.mycompany.api.entity.User;
import com.mycompany.api.repository.UserRepository;
import com.mycompany.api.service.SupabaseStorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
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

    // Cùng TTL 1h đang dùng cho ảnh phiếu (ProductionRecordService/LatexSaleService) — không có lý do
    // riêng để avatar khác, giữ 1 hằng số chung ở đây cho đơn giản.
    private static final int AVATAR_READ_URL_TTL_SECONDS = 3600;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SupabaseStorageService storageService;

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
        currentUser.setPhone(request.phone());
        // saveAndFlush — bắt trùng SĐT (UNIQUE, migration 014) ngay trong request này, không đợi tới lúc
        // transaction commit mới phát hiện (cùng pattern RateConfigService.create()).
        User saved = userRepository.saveAndFlush(currentUser);
        return toResponse(saved);
    }

    // Resolve Open Question ở docs/TASKS.md (Phase 0/1): endpoint đổi mật khẩu cho chính user đang đăng
    // nhập — dùng để đổi mật khẩu admin seed (002_seed_admin_user.sql) sang mật khẩu thật lần đầu.
    @PatchMapping("/me/password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal User currentUser,
            @Valid @RequestBody ChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.currentPassword(), currentUser.getPasswordHash())) {
            throw new BadCredentialsException("Mật khẩu hiện tại không đúng");
        }
        currentUser.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(currentUser);
        return ResponseEntity.noContent().build();
    }

    private UserProfileResponse toResponse(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().name(),
                // DB lưu objectPath thô trên bucket private "receipt-photos" (đặt tên avatarUrl nhưng
                // cùng bản chất photoUrl ở ProductionRecord/LatexSale/ScanImage) — phải ký URL đọc mới
                // hiển thị được, không trả thẳng path ra ngoài như code cũ (bug: field đã tồn tại từ
                // trước Phase Hồ sơ nhưng chưa có nơi nào từng ĐỌC LẠI avatar nên chưa lộ ra).
                user.getAvatarUrl() == null
                        ? null
                        : storageService.createSignedReadUrl(user.getAvatarUrl(), AVATAR_READ_URL_TTL_SECONDS),
                user.getPosition());
    }
}
