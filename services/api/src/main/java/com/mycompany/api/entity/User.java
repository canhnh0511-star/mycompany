package com.mycompany.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    // enum ↔ VARCHAR qua UserRoleConverter (autoApply) — xem entity.support.LowercaseEnumConverter
    @Column(nullable = false, length = 20)
    private UserRole role;

    // nullable — Admin quản lý mọi Tổ, không gắn 1 team cụ thể
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    @Column(name = "avatar_url")
    private String avatarUrl;

    // Nullable — dữ liệu cũ (seed qua email) chưa có SĐT; UNIQUE khi có giá trị (migration 014). Dùng để
    // định danh đăng nhập song song với email — xem AuthController#login.
    @Column(length = 15)
    private String phone;

    @Column(length = 100)
    private String position; // chức vụ — vd "Giám đốc", "Nhân sự"; free text

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
