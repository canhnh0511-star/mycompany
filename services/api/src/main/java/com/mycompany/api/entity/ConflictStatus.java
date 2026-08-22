package com.mycompany.api.entity;

/** Vòng đời 1 ScanBatchConflict — OVERRIDDEN dành cho conflict user chủ động bỏ qua (vd duplicate ảnh
 * user xác nhận không phải trùng). */
public enum ConflictStatus {
    OPEN,
    RESOLVED,
    OVERRIDDEN
}
