package com.mycompany.api.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.mycompany.api.entity.Employee;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * CLAUDE.md §9: fuzzy-match KHÔNG BAO GIỜ được tự đoán khi độ tương đồng dưới ngưỡng — luôn cho phép
 * người dùng chọn thủ công. Test tập trung vào ngưỡng 0.75, chuẩn hóa dấu tiếng Việt, và việc chọn ứng
 * viên tốt nhất khi có nhiều ứng viên gần đúng.
 */
class EmployeeFuzzyMatcherTest {

    private final EmployeeFuzzyMatcher matcher = new EmployeeFuzzyMatcher();

    @Test
    void matchesExactName() {
        Employee nguyenVanA = employee("Nguyễn Văn A");
        Optional<Employee> result = matcher.match("Nguyễn Văn A", List.of(nguyenVanA));

        assertThat(result).contains(nguyenVanA);
    }

    @Test
    void matchesDespiteMissingDiacritics() {
        // OCR/chữ viết tay đọc lệch dấu so với dữ liệu đã lưu — vẫn phải khớp sau khi chuẩn hóa bỏ dấu.
        Employee tranThiB = employee("Trần Thị B");
        Optional<Employee> result = matcher.match("Tran Thi B", List.of(tranThiB));

        assertThat(result).contains(tranThiB);
    }

    @Test
    void matchesDespiteCaseDifference() {
        Employee employee = employee("Lê Văn C");
        Optional<Employee> result = matcher.match("lê văn c", List.of(employee));

        assertThat(result).contains(employee);
    }

    @Test
    void returnsEmptyWhenBelowSimilarityThreshold() {
        // Tên hoàn toàn khác — không được đoán bừa, phải trả rỗng để Admin chọn thủ công.
        Employee employee = employee("Nguyễn Văn A");
        Optional<Employee> result = matcher.match("Phạm Thị Hoa", List.of(employee));

        assertThat(result).isEmpty();
    }

    @Test
    void returnsEmptyForBlankRawName() {
        Optional<Employee> result = matcher.match("  ", List.of(employee("Nguyễn Văn A")));

        assertThat(result).isEmpty();
    }

    @Test
    void returnsEmptyForNullRawName() {
        Optional<Employee> result = matcher.match(null, List.of(employee("Nguyễn Văn A")));

        assertThat(result).isEmpty();
    }

    @Test
    void returnsEmptyWhenNoCandidates() {
        Optional<Employee> result = matcher.match("Nguyễn Văn A", List.of());

        assertThat(result).isEmpty();
    }

    @Test
    void picksBestCandidateAmongMultipleCloseMatches() {
        // "Nguyễn Văn An" phải khớp gần với "Nguyễn Văn A" hơn "Nguyễn Văn Bình" — chọn ứng viên có
        // điểm tương đồng cao nhất, không phải ứng viên đầu tiên vượt ngưỡng.
        Employee closerMatch = employee("Nguyễn Văn An");
        Employee fartherMatch = employee("Nguyễn Văn Bình");
        Optional<Employee> result = matcher.match("Nguyễn Văn An", List.of(fartherMatch, closerMatch));

        assertThat(result).contains(closerMatch);
    }

    @Test
    void toleratesSingleCharacterTypo() {
        // 1 ký tự sai lệch trên tên ngắn vẫn phải vượt ngưỡng 0.75 (OCR/chữ viết tay không hoàn hảo).
        Employee employee = employee("Nguyễn Văn A");
        Optional<Employee> result = matcher.match("Nguyẽn Văn A", List.of(employee));

        assertThat(result).contains(employee);
    }

    private Employee employee(String fullName) {
        return Employee.builder().id(UUID.randomUUID()).fullName(fullName).build();
    }
}
