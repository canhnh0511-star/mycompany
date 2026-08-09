package com.mycompany.api.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

/**
 * Dùng chung cho RateConfigService/AllowanceConfigService (CLAUDE.md §4) — mô phỏng lại bằng code
 * ràng buộc EXCLUDE ở DB chống chồng lấn effective_from/to, bán-mở [from, to) giống Postgres
 * daterange(). Test các case biên: liền kề KHÔNG coi là chồng lấn, effectiveTo=null là vô cực.
 */
class DateRangeOverlapTest {

    private static final LocalDate JAN_1 = LocalDate.of(2026, 1, 1);
    private static final LocalDate FEB_1 = LocalDate.of(2026, 2, 1);
    private static final LocalDate MAR_1 = LocalDate.of(2026, 3, 1);
    private static final LocalDate APR_1 = LocalDate.of(2026, 4, 1);

    @Test
    void overlapsWhenRangesCross() {
        // [Jan1, Mar1) vs [Feb1, Apr1) — giao nhau ở [Feb1, Mar1)
        assertThat(DateRangeOverlap.overlaps(JAN_1, MAR_1, FEB_1, APR_1)).isTrue();
    }

    @Test
    void doesNotOverlapWhenAdjacent() {
        // [Jan1, Feb1) rồi [Feb1, Mar1) — liền kề đúng ngữ nghĩa nửa mở, KHÔNG chồng lấn
        assertThat(DateRangeOverlap.overlaps(JAN_1, FEB_1, FEB_1, MAR_1)).isFalse();
        assertThat(DateRangeOverlap.overlaps(FEB_1, MAR_1, JAN_1, FEB_1)).isFalse();
    }

    @Test
    void doesNotOverlapWhenCompletelySeparate() {
        assertThat(DateRangeOverlap.overlaps(JAN_1, FEB_1, MAR_1, APR_1)).isFalse();
    }

    @Test
    void nullEffectiveToMeansOpenEnded() {
        // effectiveTo=null nghĩa là đang hiệu lực vô thời hạn — chồng lấn với bất kỳ range nào bắt
        // đầu sau effectiveFrom, kể cả xa trong tương lai.
        assertThat(DateRangeOverlap.overlaps(JAN_1, null, MAR_1, APR_1)).isTrue();
    }

    @Test
    void twoOpenEndedRangesOverlapIfTheyStartBeforeEachOtherEnds() {
        assertThat(DateRangeOverlap.overlaps(JAN_1, null, FEB_1, null)).isTrue();
    }

    @Test
    void identicalRangesOverlap() {
        assertThat(DateRangeOverlap.overlaps(JAN_1, MAR_1, JAN_1, MAR_1)).isTrue();
    }

    @Test
    void oneRangeFullyContainedInAnotherOverlaps() {
        assertThat(DateRangeOverlap.overlaps(JAN_1, APR_1, FEB_1, MAR_1)).isTrue();
    }
}
