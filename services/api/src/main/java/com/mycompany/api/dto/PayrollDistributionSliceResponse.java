package com.mycompany.api.dto;

/** 1 bucket trong {@link DashboardPayrollSummaryResponse#distribution()} — khớp {@code PayrollDistributionSlice} phía FE. */
public record PayrollDistributionSliceResponse(
        String bucket, // complete | incomplete | pending_confirmation | finalized
        int count) {
}
