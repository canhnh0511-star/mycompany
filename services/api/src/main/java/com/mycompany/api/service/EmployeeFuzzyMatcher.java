package com.mycompany.api.service;

import com.mycompany.api.entity.Employee;
import java.text.Normalizer;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * Fuzzy-match tên nhân viên đọc được từ OCR với danh sách employees — luôn cho phép người dùng
 * chọn thủ công khi không khớp chính xác (CLAUDE.md §9), KHÔNG bao giờ tự đoán khi độ tương đồng
 * dưới ngưỡng. Chuẩn hóa bỏ dấu tiếng Việt + hạ chữ thường trước khi so khớp (OCR/chữ viết tay có
 * thể lệch dấu so với dữ liệu đã lưu); dùng khoảng cách Levenshtein trên chuỗi đã chuẩn hóa, quy
 * đổi thành điểm tương đồng [0,1].
 */
@Component
public class EmployeeFuzzyMatcher {

    // Ngưỡng tối thiểu để coi là khớp — dưới ngưỡng này trả về rỗng (unmatched) thay vì đoán bừa.
    private static final double MIN_SIMILARITY = 0.75;

    public Optional<Employee> match(String rawName, List<Employee> candidates) {
        if (rawName == null || rawName.isBlank() || candidates.isEmpty()) {
            return Optional.empty();
        }
        String normalizedTarget = normalize(rawName);
        return candidates.stream()
                .map(employee -> Map.entry(employee, similarity(normalizedTarget, normalize(employee.getFullName()))))
                .filter(entry -> entry.getValue() >= MIN_SIMILARITY)
                .max(Comparator.comparingDouble(Map.Entry::getValue))
                .map(Map.Entry::getKey);
    }

    private double similarity(String a, String b) {
        int distance = levenshtein(a, b);
        int maxLen = Math.max(a.length(), b.length());
        if (maxLen == 0) {
            return 1.0;
        }
        return 1.0 - ((double) distance / maxLen);
    }

    private int levenshtein(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 0; i <= a.length(); i++) {
            dp[i][0] = i;
        }
        for (int j = 0; j <= b.length(); j++) {
            dp[0][j] = j;
        }
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1), dp[i - 1][j - 1] + cost);
            }
        }
        return dp[a.length()][b.length()];
    }

    private String normalize(String input) {
        String noAccents = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return noAccents.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
    }
}
