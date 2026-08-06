package com.mycompany.api.service;

import com.mycompany.api.exception.InvalidRequestException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Validate thủ công 1 dòng trong request batch (jakarta.validation), thay vì dựa vào {@code @Valid}
 * ở tham số controller — vì {@code @Valid} trên cả List sẽ ném MethodArgumentNotValidException và
 * chặn TOÀN BỘ request ngay từ binding, không cho các dòng còn lại chạy tiếp (mâu thuẫn với best-effort
 * theo từng dòng, ADR-0007). Field nào có {@code @Valid} lồng nhau (vd items) vẫn được cascade validate
 * bình thường.
 */
@Component
@RequiredArgsConstructor
public class BatchRowValidator {

    private final Validator validator;

    public <T> void validate(T target) {
        Set<ConstraintViolation<T>> violations = validator.validate(target);
        if (violations.isEmpty()) {
            return;
        }
        String message = violations.stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .sorted()
                .reduce((a, b) -> a + "; " + b)
                .orElse("Dữ liệu không hợp lệ");
        throw new InvalidRequestException(message);
    }
}
