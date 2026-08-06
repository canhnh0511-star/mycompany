package com.mycompany.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Danh mục MỞ (docs/adr/0002-normalize-latex-type-storage.md) — code là định danh nghiệp vụ dùng ở
 * chỗ khác (vd DRC chỉ áp dụng cho code="water"), viết bằng lower_snake_case, KHÔNG đổi được sau khi
 * tạo (xem UpdateLatexTypeRequest — chỉ sửa label/unit).
 */
public record CreateLatexTypeRequest(
        @NotBlank @Size(max = 20) @Pattern(regexp = "^[a-z][a-z0-9_]*$", message = "chỉ chữ thường/số/gạch dưới, bắt đầu bằng chữ") String code,
        @NotBlank @Size(max = 50) String label,
        @Size(max = 10) String unit) {
}
