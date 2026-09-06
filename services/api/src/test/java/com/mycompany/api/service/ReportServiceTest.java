package com.mycompany.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.mycompany.api.dto.ProductionReportResponse;
import com.mycompany.api.dto.ProductionReportRow;
import com.mycompany.api.entity.Employee;
import com.mycompany.api.entity.EmployeeStatus;
import com.mycompany.api.entity.LatexType;
import com.mycompany.api.entity.Team;
import com.mycompany.api.repository.EmployeeRepository;
import com.mycompany.api.repository.LatexSaleItemRepository;
import com.mycompany.api.repository.LatexTypeRepository;
import com.mycompany.api.repository.ProductionAggregateRow;
import com.mycompany.api.repository.ProductionRecordItemRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Chia đôi kg vợ/chồng ở báo cáo sản lượng (ADR-0024, mở rộng 2026-09-06 — cùng công thức với
 * PayrollService, xem SpouseKgSplitter) — Mockito thuần, không cần DB (cùng pattern PayrollServiceTest).
 */
@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock private ProductionRecordItemRepository productionRecordItemRepository;
    @Mock private LatexSaleItemRepository latexSaleItemRepository;
    @Mock private LatexTypeRepository latexTypeRepository;
    @Mock private EmployeeRepository employeeRepository;

    private ReportService service;

    private static final LocalDate FROM = LocalDate.of(2026, 8, 1);
    private static final LocalDate TO = LocalDate.of(2026, 8, 31);

    private Team team;
    private Employee employee;
    private Employee spouse;
    private LatexType water;

    @BeforeEach
    void setUp() {
        service = new ReportService(productionRecordItemRepository, latexSaleItemRepository, latexTypeRepository, employeeRepository);

        team = Team.builder().id(UUID.randomUUID()).name("Tổ 1").build();
        water = LatexType.builder().id(UUID.randomUUID()).code("water").label("Mủ nước").unit("kg").build();
        // ID nhỏ hơn -> nhận "floor" theo quy ước SpouseKgSplitter (dùng UUID.compareTo làm mốc chia
        // deterministic) — cố định 2 UUID literal (không random) để test không phụ thuộc may rủi thứ
        // tự UUID sinh ra.
        employee = Employee.builder().id(UUID.fromString("00000000-0000-0000-0000-000000000001"))
                .fullName("Điểu Minh").team(team).status(EmployeeStatus.ACTIVE).build();
        spouse = Employee.builder().id(UUID.fromString("00000000-0000-0000-0000-000000000002"))
                .fullName("Điểu Thị Hoa").team(team).status(EmployeeStatus.ACTIVE).build();
        employee.setSpouseEmployee(spouse);
        spouse.setSpouseEmployee(employee);

        when(latexTypeRepository.findAll()).thenReturn(List.of(water));
        // applySpouseSplit chỉ gọi findById() cho employeeId CỦA DÒNG đang duyệt (rồi đọc quan hệ
        // .getSpouseEmployee() có sẵn trên entity, KHÔNG gọi findById() riêng cho phía vợ/chồng) — chỉ
        // employee (không phải spouse) xuất hiện như 1 dòng ban đầu ở cả 2 test bên dưới.
        when(employeeRepository.findById(employee.getId())).thenReturn(Optional.of(employee));
    }

    // REPORT-SPOUSE-01 — toàn bộ 21kg ghi dưới 1 người (dòng kia phiếu bỏ trống) -> báo cáo hiện cả
    // 2 người, mỗi người 10.5kg, tổng 2 dòng cộng lại đúng bằng 21kg gốc.
    @Test
    void productionReport_employeeHasActiveSpouse_splitsCombinedKgAndAddsMissingRow() {
        when(productionRecordItemRepository.aggregateForReport(FROM, TO, null, null)).thenReturn(List.of(
                new ProductionAggregateRow(employee.getId(), employee.getFullName(), team.getId(), team.getName(), "water", BigDecimal.valueOf(21))));
        when(productionRecordItemRepository.aggregateForReport(FROM, TO, null, employee.getId())).thenReturn(List.of(
                new ProductionAggregateRow(employee.getId(), employee.getFullName(), team.getId(), team.getName(), "water", BigDecimal.valueOf(21))));
        when(productionRecordItemRepository.aggregateForReport(FROM, TO, null, spouse.getId())).thenReturn(List.of());

        ProductionReportResponse response = service.productionReport(FROM, TO, null, null);

        assertThat(response.rows()).hasSize(2);
        ProductionReportRow employeeRow = response.rows().stream()
                .filter(r -> r.employeeId().equals(employee.getId())).findFirst().orElseThrow();
        ProductionReportRow spouseRow = response.rows().stream()
                .filter(r -> r.employeeId().equals(spouse.getId())).findFirst().orElseThrow();

        assertThat(employeeRow.kgByLatexType().get("water")).isEqualByComparingTo("10.5");
        assertThat(spouseRow.kgByLatexType().get("water")).isEqualByComparingTo("10.5");
        assertThat(employeeRow.totalKg().add(spouseRow.totalKg())).isEqualByComparingTo("21");
        assertThat(response.grandTotalKg()).isEqualByComparingTo("21");
    }

    // REPORT-SPOUSE-02 — drill-down đúng 1 nhân viên (employeeId filter) -> chỉ trả về đúng người
    // được yêu cầu (đã chia đôi đúng), KHÔNG tự thêm dòng cho vợ/chồng không được yêu cầu.
    @Test
    void productionReport_singleEmployeeFilter_doesNotAddSpouseRow() {
        when(productionRecordItemRepository.aggregateForReport(FROM, TO, null, employee.getId())).thenReturn(List.of(
                new ProductionAggregateRow(employee.getId(), employee.getFullName(), team.getId(), team.getName(), "water", BigDecimal.valueOf(21))));
        when(productionRecordItemRepository.aggregateForReport(FROM, TO, null, spouse.getId())).thenReturn(List.of());

        ProductionReportResponse response = service.productionReport(FROM, TO, null, employee.getId());

        assertThat(response.rows()).hasSize(1);
        assertThat(response.rows().get(0).employeeId()).isEqualTo(employee.getId());
        assertThat(response.rows().get(0).kgByLatexType().get("water")).isEqualByComparingTo("10.5");
    }
}
