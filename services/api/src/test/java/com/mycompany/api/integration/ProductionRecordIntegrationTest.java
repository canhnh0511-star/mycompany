package com.mycompany.api.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycompany.api.dto.CreateProductionRecordRequest;
import com.mycompany.api.dto.LatexItemRequest;
import com.mycompany.api.entity.Employee;
import com.mycompany.api.entity.EmployeeStatus;
import com.mycompany.api.entity.LatexType;
import com.mycompany.api.entity.Team;
import com.mycompany.api.repository.EmployeeRepository;
import com.mycompany.api.repository.LatexTypeRepository;
import com.mycompany.api.repository.ProductionRecordRepository;
import com.mycompany.api.repository.TeamRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Batch nhập tay best-effort (ADR-0007) end-to-end lên Supabase dev thật (docs/TASKS.md Phase 5).
 *
 * <p><b>KHÔNG dùng {@code @Transactional} ở class này</b> — khác {@link TeamIntegrationTest}. Lý do:
 * {@code createBatch()} chạy mỗi dòng trong 1 transaction RIÊNG qua {@code RequiresNewTransactionRunner}
 * (PROPAGATION_REQUIRES_NEW, ADR-0007) — transaction đó COMMIT THẬT ngay khi request trả về, độc lập với
 * transaction bao quanh test. Nếu bọc {@code @Transactional} ở test, 2 hệ quả xấu xảy ra: (1) Team/Employee
 * tạo ở {@code @BeforeEach} trong transaction test chưa commit → transaction REQUIRES_NEW của batch (chạy
 * trên connection khác) KHÔNG nhìn thấy, `employeeRepository.findById` trả rỗng ngay trong lúc test; (2)
 * dù có thấy fixture đi nữa, dữ liệu batch tạo ra (REQUIRES_NEW) vẫn KHÔNG bị rollback khi transaction test
 * rollback ở cuối — vẫn đọng lại trên DB dev thật, phá vỡ chính mục đích @Transactional rollback.
 * Giải pháp: tạo/dọn dữ liệu tường minh bằng repository trong {@code @BeforeEach}/{@code @AfterEach}
 * (xóa theo đúng thứ tự FK: production_records trước, rồi employee, rồi team).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
class ProductionRecordIntegrationTest extends IntegrationTestSupport {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private TeamRepository teamRepository;
    @Autowired
    private EmployeeRepository employeeRepository;
    @Autowired
    private LatexTypeRepository latexTypeRepository;
    @Autowired
    private ProductionRecordRepository productionRecordRepository;

    private Team team;
    private Employee employee;
    private LatexType waterType;

    @BeforeEach
    void setUp() {
        team = teamRepository.saveAndFlush(Team.builder().name("Tổ Integration Test " + java.util.UUID.randomUUID()).build());
        employee = employeeRepository.saveAndFlush(Employee.builder()
                .fullName("Nhân viên Integration Test")
                .team(team)
                .status(EmployeeStatus.ACTIVE)
                .build());
        waterType = latexTypeRepository.findByCode("water")
                .orElseThrow(() -> new NoSuchElementException("Seed latex_types (001_init_schema.sql) thiếu 'water'"));
    }

    @AfterEach
    void tearDown() {
        // Dọn theo đúng thứ tự FK — production_record_items cascade ON DELETE CASCADE nên chỉ cần
        // xóa header (xem 001_init_schema.sql).
        productionRecordRepository.findAll().stream()
                .filter(r -> r.getEmployee().getId().equals(employee.getId()))
                .forEach(productionRecordRepository::delete);
        employeeRepository.delete(employee);
        teamRepository.delete(team);
    }

    @Test
    void batchCreate_thenDuplicateSameDay_conflicts_thenCancel_thenReCreate_succeeds() throws Exception {
        LocalDate recordDate = LocalDate.now();
        List<CreateProductionRecordRequest> firstBatch = List.of(
                new CreateProductionRecordRequest(recordDate, employee.getId(), "ghi chú đầu",
                        List.of(new LatexItemRequest(waterType.getId(), BigDecimal.valueOf(12.5), BigDecimal.valueOf(35)))));

        String firstResponseJson = mockMvc.perform(post("/api/v1/production-records/batch")
                        .header("Authorization", adminAuthorizationHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(firstBatch)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].success").value(true))
                .andExpect(jsonPath("$.results[0].data.status").value("CONFIRMED"))
                .andReturn().getResponse().getContentAsString();
        String recordId = objectMapper.readTree(firstResponseJson).at("/results/0/data/id").asText();

        // Cùng employee + cùng ngày lần 2 → dòng này phải lỗi 409 nhưng KHÔNG ảnh hưởng response OK chung
        // (best-effort per-row, ADR-0007) — response request vẫn 200, chỉ phần tử results[0] báo lỗi.
        List<CreateProductionRecordRequest> duplicateBatch = List.of(
                new CreateProductionRecordRequest(recordDate, employee.getId(), "trùng ngày",
                        List.of(new LatexItemRequest(waterType.getId(), BigDecimal.ONE, null))));
        mockMvc.perform(post("/api/v1/production-records/batch")
                        .header("Authorization", adminAuthorizationHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicateBatch)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].success").value(false))
                .andExpect(jsonPath("$.results[0].error").value(org.hamcrest.Matchers.containsString("đã có bản ghi sản lượng active")));

        // Hủy bản ghi đầu → giải phóng slot (record_date, employee_id) — CLAUDE.md §4.
        mockMvc.perform(post("/api/v1/production-records/{id}/cancel", recordId)
                        .header("Authorization", adminAuthorizationHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        // Sau khi hủy, nhập lại đúng ngày đó phải thành công (không còn active duplicate).
        mockMvc.perform(post("/api/v1/production-records/batch")
                        .header("Authorization", adminAuthorizationHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicateBatch)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].success").value(true));

        // Hủy lần 2 phải bị chặn 409 — không tự bung ra 500 (dùng ProblemDetail qua GlobalExceptionHandler).
        mockMvc.perform(post("/api/v1/production-records/{id}/cancel", recordId)
                        .header("Authorization", adminAuthorizationHeader()))
                .andExpect(status().isConflict());
    }

    @Test
    void batchCreate_returns200WithPerRowError_whenEmployeeDoesNotExist() throws Exception {
        java.util.UUID unknownEmployeeId = java.util.UUID.randomUUID();
        List<CreateProductionRecordRequest> requests = List.of(
                new CreateProductionRecordRequest(LocalDate.now(), unknownEmployeeId, null,
                        List.of(new LatexItemRequest(waterType.getId(), BigDecimal.ONE, null))));

        mockMvc.perform(post("/api/v1/production-records/batch")
                        .header("Authorization", adminAuthorizationHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requests)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].success").value(false))
                .andExpect(jsonPath("$.results[0].error").value(org.hamcrest.Matchers.containsString("Không tìm thấy nhân viên")));
    }
}
