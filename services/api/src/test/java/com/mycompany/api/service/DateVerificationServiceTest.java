package com.mycompany.api.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.mycompany.api.entity.DateResolution;
import com.mycompany.api.entity.DateVerificationStatus;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

/** Spec 1 mục 4 — NOT_DETECTED/MATCHED/MISMATCH, RULE 2 (OCR date không tự ghi đè workDate). */
class DateVerificationServiceTest {

    private final DateVerificationService service = new DateVerificationService();
    private final LocalDate sessionWorkDate = LocalDate.of(2026, 8, 22);

    @Test
    void ocrDateNull_returnsNotDetected_fallbackToSessionDate_noBlocking() {
        DateVerificationService.Result result = service.verify(sessionWorkDate, null);

        assertThat(result.status()).isEqualTo(DateVerificationStatus.NOT_DETECTED);
        assertThat(result.resolution()).isEqualTo(DateResolution.FALLBACK_SESSION_DATE);
        assertThat(result.effectiveDate()).isEqualTo(sessionWorkDate);
    }

    @Test
    void ocrDateMatchesSessionDate_returnsMatched_noResolutionNeeded() {
        DateVerificationService.Result result = service.verify(sessionWorkDate, sessionWorkDate);

        assertThat(result.status()).isEqualTo(DateVerificationStatus.MATCHED);
        assertThat(result.resolution()).isNull();
        assertThat(result.effectiveDate()).isEqualTo(sessionWorkDate);
    }

    @Test
    void ocrDateDiffersFromSessionDate_returnsMismatch_unresolved_effectiveDateStillSession() {
        LocalDate ocrDate = sessionWorkDate.minusDays(1);

        DateVerificationService.Result result = service.verify(sessionWorkDate, ocrDate);

        assertThat(result.status()).isEqualTo(DateVerificationStatus.MISMATCH);
        assertThat(result.resolution()).isEqualTo(DateResolution.UNRESOLVED);
        // RULE 2 — OCR date chỉ để verify, KHÔNG tự ghi đè workDate cho tới khi user resolve.
        assertThat(result.effectiveDate()).isEqualTo(sessionWorkDate);
    }
}
