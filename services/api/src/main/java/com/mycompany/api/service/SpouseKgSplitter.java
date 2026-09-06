package com.mycompany.api.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Chia đôi kg thô của 2 vợ/chồng theo từng loại mủ (ADR-0024) — dùng chung cho
 * {@link PayrollService} (tính lương) và {@link ReportService} (báo cáo sản lượng theo nhân viên),
 * tách ra đây để 2 nơi KHÔNG lặp lại cùng 1 công thức làm tròn (trước đây chỉ có ở PayrollService).
 *
 * <p>{@code floor(tổng/2, 2 chữ số)} cho bên {@code takeFloor}, phần dư cho bên kia — cộng lại đúng
 * bằng số gốc, không mất mát dù tổng lẻ (vd 21kg → 10.50/10.50; 21.01kg → 10.50/10.51).
 */
final class SpouseKgSplitter {

    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private SpouseKgSplitter() {
    }

    static Map<String, BigDecimal> combinedHalf(Map<String, BigDecimal> kgA, Map<String, BigDecimal> kgB, boolean takeFloor) {
        Set<String> codes = new HashSet<>();
        codes.addAll(kgA.keySet());
        codes.addAll(kgB.keySet());
        Map<String, BigDecimal> result = new HashMap<>();
        for (String code : codes) {
            BigDecimal combined = kgA.getOrDefault(code, ZERO).add(kgB.getOrDefault(code, ZERO));
            BigDecimal half = combined.divide(BigDecimal.valueOf(2), 2, RoundingMode.DOWN);
            result.put(code, takeFloor ? half : combined.subtract(half));
        }
        return result;
    }
}
