package com.mycompany.api.service;

import com.mycompany.api.dto.AttendanceRecordResponse;
import com.mycompany.api.dto.BatchResult;
import com.mycompany.api.dto.BatchResult.BatchItemResult;
import com.mycompany.api.dto.CreateAttendanceRecordRequest;
import com.mycompany.api.dto.UpdateAttendanceRecordRequest;
import com.mycompany.api.entity.AttendanceRecord;
import com.mycompany.api.entity.AttendanceType;
import com.mycompany.api.entity.Employee;
import com.mycompany.api.entity.RecordStatus;
import com.mycompany.api.entity.User;
import com.mycompany.api.exception.ConflictException;
import com.mycompany.api.exception.InvalidRequestException;
import com.mycompany.api.repository.AttendanceRecordRepository;
import com.mycompany.api.repository.EmployeeRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Công/chuyên cần theo ngày — tách riêng khỏi ProductionRecord vì logic tính lương khác sản lượng
 * (CLAUDE.md §4). Không có ràng buộc unique ở DB theo (employee, ngày, loại) — 1 nhân viên có thể có
 * nhiều dòng chấm công khác attendance_type cùng ngày. Nhập tay (batch, ADR-0007) ghi thẳng
 * status=confirmed (docs/TASKS.md Phase 2, khác thiết kế cũ PATCH ghi đè trực tiếp).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class AttendanceRecordService {

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final EmployeeRepository employeeRepository;
    private final EditHistoryService editHistoryService;
    private final BatchRowValidator batchRowValidator;
    private final RequiresNewTransactionRunner transactionRunner;

    private static final String TABLE_NAME = "attendance_records";

    // Không @Transactional ở mức method này — xem ghi chú tương ứng trong ProductionRecordService.
    public BatchResult<AttendanceRecordResponse> createBatch(List<CreateAttendanceRecordRequest> requests, User currentUser) {
        List<BatchItemResult<AttendanceRecordResponse>> results = new ArrayList<>();
        for (int i = 0; i < requests.size(); i++) {
            int index = i;
            CreateAttendanceRecordRequest request = requests.get(i);
            try {
                AttendanceRecordResponse created = transactionRunner.run(() -> createOne(request, currentUser));
                results.add(BatchItemResult.ok(index, created));
            } catch (RuntimeException ex) {
                results.add(BatchItemResult.failed(index, resolveErrorMessage(ex)));
            }
        }
        return new BatchResult<>(results);
    }

    public AttendanceRecordResponse get(UUID id) {
        return toResponse(findOrThrow(id));
    }

    // GET list + filter (docs/TASKS.md Phase 4) — bao gồm cả draft chưa confirm khi không lọc status.
    public Page<AttendanceRecordResponse> list(UUID teamId, UUID employeeId, LocalDate fromDate,
            LocalDate toDate, RecordStatus status, AttendanceType attendanceType, Pageable pageable) {
        Specification<AttendanceRecord> spec = AttendanceRecordSpecifications.withFilters(
                teamId, employeeId, fromDate, toDate, status, attendanceType);
        return attendanceRecordRepository.findAll(spec, pageable).map(this::toResponse);
    }

    @Transactional
    public AttendanceRecordResponse update(UUID id, UpdateAttendanceRecordRequest request, User currentUser) {
        AttendanceRecord record = findOrThrow(id);
        if (record.getStatus() == RecordStatus.CANCELLED) {
            throw new ConflictException("Bản ghi id=" + id + " đã bị hủy — không thể sửa");
        }
        boolean shouldLog = record.getStatus() != RecordStatus.DRAFT;
        AttendanceRecordResponse before = shouldLog ? toResponse(record) : null;

        Employee employee = findEmployeeOrThrow(request.employeeId());
        record.setRecordDate(request.recordDate());
        record.setEmployee(employee);
        record.setAttendanceType(request.attendanceType());
        record.setQuantity(request.quantity());
        record.setNotes(request.notes());

        AttendanceRecordResponse after = toResponse(attendanceRecordRepository.save(record));
        if (shouldLog) {
            editHistoryService.recordEdit(TABLE_NAME, id, currentUser, before, after);
        }
        return after;
    }

    @Transactional
    public AttendanceRecordResponse cancel(UUID id, User currentUser) {
        AttendanceRecord record = findOrThrow(id);
        if (record.getStatus() == RecordStatus.CANCELLED) {
            throw new ConflictException("Bản ghi id=" + id + " đã bị hủy trước đó");
        }
        boolean shouldLog = record.getStatus() != RecordStatus.DRAFT;
        AttendanceRecordResponse before = shouldLog ? toResponse(record) : null;

        record.setStatus(RecordStatus.CANCELLED);
        AttendanceRecordResponse after = toResponse(attendanceRecordRepository.save(record));
        if (shouldLog) {
            editHistoryService.recordEdit(TABLE_NAME, id, currentUser, before, after);
        }
        return after;
    }

    private AttendanceRecordResponse createOne(CreateAttendanceRecordRequest request, User currentUser) {
        batchRowValidator.validate(request);
        Employee employee = findEmployeeOrThrow(request.employeeId());

        AttendanceRecord record = AttendanceRecord.builder()
                .recordDate(request.recordDate())
                .employee(employee)
                .attendanceType(request.attendanceType())
                .quantity(request.quantity())
                .notes(request.notes())
                .status(RecordStatus.CONFIRMED)
                .createdBy(currentUser)
                .build();
        // saveAndFlush — xem ghi chú trong TeamService.create() về @CreationTimestamp + id sinh client-side.
        return toResponse(attendanceRecordRepository.saveAndFlush(record));
    }

    private String resolveErrorMessage(RuntimeException ex) {
        if (ex instanceof ConflictException || ex instanceof InvalidRequestException || ex instanceof NoSuchElementException) {
            return ex.getMessage();
        }
        if (ex instanceof DataIntegrityViolationException) {
            return "Dữ liệu vi phạm ràng buộc (tham chiếu không hợp lệ)";
        }
        log.warn("Lỗi không mong đợi khi xử lý 1 dòng batch attendance-records: {}", ex.getMessage(), ex);
        return "Lỗi xử lý dòng này — vui lòng thử lại hoặc liên hệ hỗ trợ";
    }

    private Employee findEmployeeOrThrow(UUID employeeId) {
        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy nhân viên với id=" + employeeId));
    }

    private AttendanceRecord findOrThrow(UUID id) {
        return attendanceRecordRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy attendance_record với id=" + id));
    }

    private AttendanceRecordResponse toResponse(AttendanceRecord record) {
        return new AttendanceRecordResponse(
                record.getId(),
                record.getRecordDate(),
                record.getEmployee().getId(),
                record.getEmployee().getFullName(),
                record.getAttendanceType().name(),
                record.getQuantity(),
                record.getNotes(),
                record.getCreatedBy().getId(),
                record.getCreatedAt(),
                record.getStatus().name());
    }
}
