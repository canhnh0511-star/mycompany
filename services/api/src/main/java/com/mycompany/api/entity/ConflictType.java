package com.mycompany.api.entity;

/** Loại blocking conflict trong 1 ScanBatch (Spec 1 mục 6). */
public enum ConflictType {
    DUPLICATE_IMAGE,
    IMAGE_QUALITY_OR_OCR_FAILED,
    DATE_MISMATCH,
    UNKNOWN_EMPLOYEE,
    INVALID_BUSINESS_VALUE,
    POTENTIAL_DUPLICATE_OCR_ROW,
    PENDING_MOVE,
    OTHER
}
