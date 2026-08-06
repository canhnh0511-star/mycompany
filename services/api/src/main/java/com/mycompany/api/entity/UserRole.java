package com.mycompany.api.entity;

/**
 * Ở Module 1 release 1 chỉ ADMIN thực sự đăng nhập/thao tác — xem docs/adr/0001-admin-only-v1-scope.md.
 * TEAM_LEAD đã có sẵn trong schema cho release sau, chưa dùng trong luồng auth v1.
 */
public enum UserRole {
    TEAM_LEAD,
    ADMIN
}
