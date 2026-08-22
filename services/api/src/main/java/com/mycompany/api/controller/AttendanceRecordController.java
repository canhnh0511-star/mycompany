package com.mycompany.api.controller;

import com.mycompany.api.dto.AttendanceRecordResponse;
import com.mycompany.api.dto.BatchResult;
import com.mycompany.api.dto.CreateAttendanceRecordRequest;
import com.mycompany.api.dto.UpdateAttendanceRecordRequest;
import com.mycompany.api.entity.AttendanceRecordStatus;
import com.mycompany.api.entity.AttendanceType;
import com.mycompany.api.entity.User;
import com.mycompany.api.service.AttendanceRecordService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort.Direction;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/attendance-records")
@RequiredArgsConstructor
public class AttendanceRecordController {

    private final AttendanceRecordService attendanceRecordService;

    // KHÔNG @Valid ở đây — xem ghi chú tương ứng trong ProductionRecordController.
    @PostMapping("/batch")
    public BatchResult<AttendanceRecordResponse> createBatch(
            @RequestBody List<CreateAttendanceRecordRequest> requests,
            @AuthenticationPrincipal User currentUser) {
        return attendanceRecordService.createBatch(requests, currentUser);
    }

    @GetMapping("/{id}")
    public AttendanceRecordResponse get(@PathVariable UUID id) {
        return attendanceRecordService.get(id);
    }

    // Tab "Tra cứu" (CLAUDE.md §5) — mặc định trả cả draft chưa confirm khi không lọc status.
    @GetMapping
    public Page<AttendanceRecordResponse> list(
            @RequestParam(required = false) UUID teamId,
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) AttendanceRecordStatus status,
            @RequestParam(required = false) AttendanceType attendanceType,
            @PageableDefault(size = 50, sort = "recordDate", direction = Direction.DESC) Pageable pageable) {
        return attendanceRecordService.list(teamId, employeeId, fromDate, toDate, status, attendanceType, pageable);
    }

    @PatchMapping("/{id}")
    public AttendanceRecordResponse update(@PathVariable UUID id,
            @Valid @RequestBody UpdateAttendanceRecordRequest request,
            @AuthenticationPrincipal User currentUser) {
        return attendanceRecordService.update(id, request, currentUser);
    }

    // "Xóa" = chuyển status → cancelled, không hard delete (CLAUDE.md §4).
    @PostMapping("/{id}/cancel")
    public AttendanceRecordResponse cancel(@PathVariable UUID id, @AuthenticationPrincipal User currentUser) {
        return attendanceRecordService.cancel(id, currentUser);
    }
}
