package com.mycompany.api.service;

import com.mycompany.api.entity.DateResolution;
import com.mycompany.api.entity.DateVerificationStatus;
import java.time.LocalDate;
import org.springframework.stereotype.Service;

/**
 * So sánh ngày OCR đọc trên phiếu với sessionWorkDate (Spec 1 mục 4). Pure logic, không đụng DB —
 * tách riêng để unit test precedence dễ dàng (không cần Spring context).
 * RULE 2: OCR date chỉ để verify, KHÔNG BAO GIỜ tự ghi đè workDate — effectiveDate ở đây luôn là
 * sessionWorkDate; chỉ đổi sang ocrDetectedDate sau khi user CHỦ ĐỘNG chọn CHANGE_DATE (xem
 * ScanBatchService.resolveDate).
 */
@Service
public class DateVerificationService {

    public record Result(DateVerificationStatus status, DateResolution resolution, LocalDate effectiveDate) {
    }

    public Result verify(LocalDate sessionWorkDate, LocalDate ocrDetectedDate) {
        if (ocrDetectedDate == null) {
            // NOT_DETECTED — hệ thống tự resolve, không block, không cần user xác nhận (RULE 13).
            return new Result(DateVerificationStatus.NOT_DETECTED, DateResolution.FALLBACK_SESSION_DATE, sessionWorkDate);
        }
        if (ocrDetectedDate.equals(sessionWorkDate)) {
            return new Result(DateVerificationStatus.MATCHED, null, sessionWorkDate);
        }
        // MISMATCH — cần user resolve thủ công (RULE 7); effectiveDate giữ nguyên sessionWorkDate
        // cho tới khi resolve.
        return new Result(DateVerificationStatus.MISMATCH, DateResolution.UNRESOLVED, sessionWorkDate);
    }
}
