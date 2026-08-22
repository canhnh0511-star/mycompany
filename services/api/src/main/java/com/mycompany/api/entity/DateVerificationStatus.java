package com.mycompany.api.entity;

/** Kết quả so sánh ngày OCR đọc trên phiếu với sessionWorkDate (Spec 1 mục 4). */
public enum DateVerificationStatus {
    MATCHED,
    NOT_DETECTED,
    MISMATCH
}
