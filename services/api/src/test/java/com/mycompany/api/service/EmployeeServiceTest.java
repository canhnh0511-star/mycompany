package com.mycompany.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.mycompany.api.dto.EmployeeResponse;
import com.mycompany.api.dto.UpdateEmployeeRequest;
import com.mycompany.api.entity.Employee;
import com.mycompany.api.entity.EmployeeStatus;
import com.mycompany.api.entity.Team;
import com.mycompany.api.exception.ConflictException;
import com.mycompany.api.exception.InvalidRequestException;
import com.mycompany.api.repository.EmployeeRepository;
import com.mycompany.api.repository.TeamRepository;
import com.mycompany.api.repository.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test quan hệ vợ/chồng đối xứng (CLAUDE.md §5, EmployeeService.updateSpouse) — set/gỡ luôn đồng bộ
 * 2 chiều, tự trỏ chính mình bị chặn, và gán vào người đã có vợ/chồng khác phải báo Conflict thay vì
 * âm thầm ghi đè.
 */
@ExtendWith(MockitoExtension.class)
class EmployeeServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private UserRepository userRepository;

    private EmployeeService service;

    private Team team;
    private Employee husband;
    private Employee wife;
    private Employee thirdEmployee;

    @BeforeEach
    void setUp() {
        service = new EmployeeService(employeeRepository, teamRepository, userRepository);

        team = Team.builder().id(UUID.randomUUID()).name("Tổ 1").build();
        husband = Employee.builder().id(UUID.randomUUID()).fullName("Điểu Minh").team(team)
                .status(EmployeeStatus.ACTIVE).build();
        wife = Employee.builder().id(UUID.randomUUID()).fullName("Thị Ngọc").team(team)
                .status(EmployeeStatus.ACTIVE).build();
        thirdEmployee = Employee.builder().id(UUID.randomUUID()).fullName("Nguyễn Văn A").team(team)
                .status(EmployeeStatus.ACTIVE).build();

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
    }

    @Test
    void update_setsSpouseSymmetrically_onBothSides() {
        when(employeeRepository.findById(husband.getId())).thenReturn(Optional.of(husband));
        when(employeeRepository.findById(wife.getId())).thenReturn(Optional.of(wife));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(inv -> inv.getArgument(0));

        EmployeeResponse response = service.update(husband.getId(), updateRequest(wife.getId()));

        assertThat(response.spouseEmployeeId()).isEqualTo(wife.getId());
        assertThat(husband.getSpouseEmployee()).isEqualTo(wife);
        assertThat(wife.getSpouseEmployee()).isEqualTo(husband); // đối xứng — gán 1 bên tự trỏ ngược
    }

    @Test
    void update_clearsSpouseSymmetrically_onBothSides() {
        husband.setSpouseEmployee(wife);
        wife.setSpouseEmployee(husband);
        when(employeeRepository.findById(husband.getId())).thenReturn(Optional.of(husband));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(inv -> inv.getArgument(0));

        EmployeeResponse response = service.update(husband.getId(), updateRequest(null));

        assertThat(response.spouseEmployeeId()).isNull();
        assertThat(husband.getSpouseEmployee()).isNull();
        assertThat(wife.getSpouseEmployee()).isNull(); // gỡ 1 bên cũng tự gỡ bên kia
    }

    @Test
    void update_reassigningSpouse_clearsOldPartnerFirst() {
        husband.setSpouseEmployee(wife);
        wife.setSpouseEmployee(husband);
        when(employeeRepository.findById(husband.getId())).thenReturn(Optional.of(husband));
        when(employeeRepository.findById(thirdEmployee.getId())).thenReturn(Optional.of(thirdEmployee));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(inv -> inv.getArgument(0));

        EmployeeResponse response = service.update(husband.getId(), updateRequest(thirdEmployee.getId()));

        assertThat(response.spouseEmployeeId()).isEqualTo(thirdEmployee.getId());
        assertThat(husband.getSpouseEmployee()).isEqualTo(thirdEmployee);
        assertThat(thirdEmployee.getSpouseEmployee()).isEqualTo(husband);
        assertThat(wife.getSpouseEmployee()).isNull(); // vợ cũ được gỡ liên kết, không còn treo lơ lửng
    }

    @Test
    void update_throwsInvalidRequest_whenSpouseIsSelf() {
        when(employeeRepository.findById(husband.getId())).thenReturn(Optional.of(husband));

        assertThrows(InvalidRequestException.class,
                () -> service.update(husband.getId(), updateRequest(husband.getId())));
    }

    @Test
    void update_throwsConflict_whenTargetAlreadyHasDifferentSpouse() {
        wife.setSpouseEmployee(thirdEmployee); // Thị Ngọc đã khai báo vợ/chồng với người khác
        when(employeeRepository.findById(husband.getId())).thenReturn(Optional.of(husband));
        when(employeeRepository.findById(wife.getId())).thenReturn(Optional.of(wife));

        assertThrows(ConflictException.class,
                () -> service.update(husband.getId(), updateRequest(wife.getId())));
    }

    private UpdateEmployeeRequest updateRequest(UUID spouseEmployeeId) {
        return new UpdateEmployeeRequest("Điểu Minh", team.getId(), EmployeeStatus.ACTIVE, null, spouseEmployeeId);
    }
}
