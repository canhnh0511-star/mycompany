package com.mycompany.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycompany.api.dto.BatchResult;
import com.mycompany.api.dto.CreateProductionRecordRequest;
import com.mycompany.api.dto.LatexItemRequest;
import com.mycompany.api.dto.ProductionRecordResponse;
import com.mycompany.api.dto.UpdateProductionRecordRequest;
import com.mycompany.api.entity.Employee;
import com.mycompany.api.entity.LatexType;
import com.mycompany.api.entity.ProductionRecord;
import com.mycompany.api.entity.RecordSource;
import com.mycompany.api.entity.RecordStatus;
import com.mycompany.api.entity.Team;
import com.mycompany.api.entity.User;
import com.mycompany.api.exception.ConflictException;
import com.mycompany.api.repository.EmployeeRepository;
import com.mycompany.api.repository.LatexTypeRepository;
import com.mycompany.api.repository.ProductionRecordRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test 2 hành vi nghiệp vụ phức tạp nhất của service này (docs/TASKS.md Phase 5):
 * 1) batch best-effort theo từng dòng (ADR-0007) — 1 dòng lỗi không chặn/rollback các dòng khác.
 * 2) guard "chỉ ghi edit_history khi record đã APPROVED trước khi sửa/hủy" (docs/TASKS.md Phase 2).
 * RequiresNewTransactionRunner bị mock để chạy action trực tiếp (không cần transaction thật) — test
 * này chỉ xác nhận HÀNH VI best-effort ở tầng service, không test cơ chế transaction của Spring.
 */
@ExtendWith(MockitoExtension.class)
class ProductionRecordServiceTest {

    @Mock
    private ProductionRecordRepository productionRecordRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private LatexTypeRepository latexTypeRepository;
    @Mock
    private EditHistoryService editHistoryService;

    private final BatchRowValidator batchRowValidator = new BatchRowValidator(
            jakarta.validation.Validation.buildDefaultValidatorFactory().getValidator());
    private final RequiresNewTransactionRunner transactionRunner = mock(RequiresNewTransactionRunner.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    private ProductionRecordService service;

    private User currentUser;
    private Employee employee;
    private LatexType waterType;

    @BeforeEach
    void setUp() {
        service = new ProductionRecordService(productionRecordRepository, employeeRepository,
                latexTypeRepository, editHistoryService, batchRowValidator, transactionRunner, objectMapper);

        currentUser = User.builder().id(UUID.randomUUID()).fullName("Admin").build();
        Team team = Team.builder().id(UUID.randomUUID()).name("Tổ 1").build();
        employee = Employee.builder().id(UUID.randomUUID()).fullName("Nguyễn Văn A").team(team).build();
        waterType = LatexType.builder().id(UUID.randomUUID()).code("water").label("Mủ nước").unit("kg").build();

        // Action thật chạy trực tiếp (không cần transaction thật) — đúng tinh thần best-effort:
        // dòng nào action.get() ném exception, dòng đó lỗi, không ảnh hưởng dòng khác.
        doAnswer(invocation -> {
            Supplier<?> action = invocation.getArgument(0);
            return action.get();
        }).when(transactionRunner).run(any());
    }

    @Test
    void batchIsBestEffort_oneFailingRowDoesNotAffectOthers() {
        CreateProductionRecordRequest okRequest = validRequest();
        CreateProductionRecordRequest failingRequest = validRequest(); // sẽ lỗi vì không tìm thấy employee

        when(employeeRepository.findById(employee.getId())).thenReturn(Optional.of(employee));
        when(latexTypeRepository.findById(waterType.getId())).thenReturn(Optional.of(waterType));
        when(productionRecordRepository.existsByEmployeeIdAndRecordDateAndStatusNot(
                any(), any(), any())).thenReturn(false);
        when(productionRecordRepository.saveAndFlush(any(ProductionRecord.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        UUID unknownEmployeeId = UUID.randomUUID();
        CreateProductionRecordRequest requestWithUnknownEmployee = new CreateProductionRecordRequest(
                LocalDate.now(), unknownEmployeeId, null, List.of(new LatexItemRequest(waterType.getId(), BigDecimal.TEN, null)));
        when(employeeRepository.findById(unknownEmployeeId)).thenReturn(Optional.empty());

        BatchResult<ProductionRecordResponse> result = service.createBatch(
                List.of(okRequest, requestWithUnknownEmployee), currentUser);

        assertThat(result.results()).hasSize(2);
        assertThat(result.results().get(0).success()).isTrue();
        assertThat(result.results().get(0).index()).isEqualTo(0);
        assertThat(result.results().get(0).data()).isNotNull();

        assertThat(result.results().get(1).success()).isFalse();
        assertThat(result.results().get(1).index()).isEqualTo(1);
        assertThat(result.results().get(1).error()).contains("Không tìm thấy nhân viên");
    }

    @Test
    void update_doesNotLogEditHistory_whenRecordWasStillDraft() {
        ProductionRecord draftRecord = existingRecord(RecordStatus.DRAFT);
        when(productionRecordRepository.findById(draftRecord.getId())).thenReturn(Optional.of(draftRecord));
        when(employeeRepository.findById(employee.getId())).thenReturn(Optional.of(employee));
        when(latexTypeRepository.findById(waterType.getId())).thenReturn(Optional.of(waterType));
        when(productionRecordRepository.saveAndFlush(any(ProductionRecord.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(productionRecordRepository.save(any(ProductionRecord.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.update(draftRecord.getId(), updateRequest(), currentUser);

        verify(editHistoryService, never()).recordEdit(any(), any(), any(), any(), any());
    }

    @Test
    void update_logsEditHistory_whenRecordWasAlreadyConfirmed() {
        ProductionRecord confirmedRecord = existingRecord(RecordStatus.APPROVED);
        when(productionRecordRepository.findById(confirmedRecord.getId())).thenReturn(Optional.of(confirmedRecord));
        when(employeeRepository.findById(employee.getId())).thenReturn(Optional.of(employee));
        when(latexTypeRepository.findById(waterType.getId())).thenReturn(Optional.of(waterType));
        when(productionRecordRepository.saveAndFlush(any(ProductionRecord.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(productionRecordRepository.save(any(ProductionRecord.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.update(confirmedRecord.getId(), updateRequest(), currentUser);

        verify(editHistoryService).recordEdit(
                org.mockito.ArgumentMatchers.eq("production_records"),
                org.mockito.ArgumentMatchers.eq(confirmedRecord.getId()),
                org.mockito.ArgumentMatchers.eq(currentUser), any(), any());
    }

    @Test
    void cancel_doesNotLogEditHistory_whenRecordWasStillDraft() {
        ProductionRecord draftRecord = existingRecord(RecordStatus.DRAFT);
        when(productionRecordRepository.findById(draftRecord.getId())).thenReturn(Optional.of(draftRecord));
        when(productionRecordRepository.save(any(ProductionRecord.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.cancel(draftRecord.getId(), currentUser);

        verify(editHistoryService, never()).recordEdit(any(), any(), any(), any(), any());
    }

    @Test
    void cancel_throwsConflict_whenAlreadyCancelled() {
        ProductionRecord cancelledRecord = existingRecord(RecordStatus.CANCELLED);
        when(productionRecordRepository.findById(cancelledRecord.getId())).thenReturn(Optional.of(cancelledRecord));

        org.junit.jupiter.api.Assertions.assertThrows(ConflictException.class,
                () -> service.cancel(cancelledRecord.getId(), currentUser));
    }

    private CreateProductionRecordRequest validRequest() {
        return new CreateProductionRecordRequest(LocalDate.now(), employee.getId(), null,
                List.of(new LatexItemRequest(waterType.getId(), BigDecimal.TEN, BigDecimal.valueOf(35))));
    }

    private UpdateProductionRecordRequest updateRequest() {
        return new UpdateProductionRecordRequest(LocalDate.now(), employee.getId(), "sửa lại",
                List.of(new LatexItemRequest(waterType.getId(), BigDecimal.ONE, null)));
    }

    private ProductionRecord existingRecord(RecordStatus status) {
        Team team = employee.getTeam();
        return ProductionRecord.builder()
                .id(UUID.randomUUID())
                .recordDate(LocalDate.now())
                .employee(employee)
                .team(team)
                .source(RecordSource.MANUAL)
                .status(status)
                .createdBy(currentUser)
                .build();
    }
}
