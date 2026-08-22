package com.mycompany.api.entity;

/**
 * Cách 1 date-verification được resolve (Spec 1 mục 4/5). FALLBACK_SESSION_DATE = hệ thống tự set
 * khi NOT_DETECTED (audit performedBySystem=true); KEEP_SESSION_DATE/CHANGE_DATE = user tự chọn khi
 * MISMATCH; UNRESOLVED = mismatch chưa/không còn được resolve (kể cả sau khi supplement bị
 * reject/cancel — RULE 15, không giữ resolution cũ).
 */
public enum DateResolution {
    FALLBACK_SESSION_DATE,
    KEEP_SESSION_DATE,
    CHANGE_DATE,
    UNRESOLVED
}
