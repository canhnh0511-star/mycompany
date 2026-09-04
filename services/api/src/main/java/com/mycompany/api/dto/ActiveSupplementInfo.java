package com.mycompany.api.dto;

import java.util.UUID;

/** Spec 2 §5/§30 — chỉ set khi derivedStatus = APPROVED_WITH_ACTIVE_SUPPLEMENT (Case F). */
public record ActiveSupplementInfo(UUID batchId, String status) {
}
