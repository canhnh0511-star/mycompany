package com.mycompany.api.dto;

import com.mycompany.api.entity.DateResolution;
import jakarta.validation.constraints.NotNull;

/** Chỉ chấp nhận KEEP_SESSION_DATE | CHANGE_DATE — validate ở service (Spec 1 mục 4-5). */
public record ResolveDateRequest(@NotNull DateResolution resolution) {
}
