package com.mycompany.api.dto;

import com.mycompany.api.entity.CalcType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/** code KHÔNG sửa được qua đây — xem CreateAllowanceConfigRequest. */
public record UpdateAllowanceConfigRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull CalcType calcType,
        @NotNull @Positive BigDecimal unitPrice,
        @NotNull LocalDate effectiveFrom,
        LocalDate effectiveTo) {
}
