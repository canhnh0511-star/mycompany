package com.mycompany.api.service;

import com.mycompany.api.dto.CreateEmployeeRequest;
import com.mycompany.api.dto.EmployeeResponse;
import com.mycompany.api.dto.UpdateEmployeeRequest;
import com.mycompany.api.entity.Employee;
import com.mycompany.api.entity.EmployeeStatus;
import com.mycompany.api.entity.Team;
import com.mycompany.api.entity.User;
import com.mycompany.api.exception.ConflictException;
import com.mycompany.api.exception.InvalidRequestException;
import com.mycompany.api.repository.EmployeeRepository;
import com.mycompany.api.repository.TeamRepository;
import com.mycompany.api.repository.UserRepository;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;

    public List<EmployeeResponse> list(UUID teamId, EmployeeStatus status) {
        List<Employee> employees;
        if (teamId != null && status != null) {
            employees = employeeRepository.findByTeamIdAndStatus(teamId, status);
        } else if (teamId != null) {
            employees = employeeRepository.findByTeamId(teamId);
        } else if (status != null) {
            employees = employeeRepository.findByStatus(status);
        } else {
            employees = employeeRepository.findAll();
        }
        return employees.stream().map(this::toResponse).toList();
    }

    public EmployeeResponse get(UUID id) {
        return toResponse(findOrThrow(id));
    }

    @Transactional
    public EmployeeResponse create(CreateEmployeeRequest request) {
        Team team = findTeamOrThrow(request.teamId());
        User user = resolveUser(request.userId());
        if (request.userId() != null && employeeRepository.existsByUserId(request.userId())) {
            throw new ConflictException("User id=" + request.userId() + " đã gắn với 1 nhân viên khác");
        }

        Employee employee = Employee.builder()
                .fullName(request.fullName())
                .team(team)
                .user(user)
                .status(EmployeeStatus.ACTIVE)
                .build();
        // saveAndFlush — xem ghi chú trong TeamService.create() về @CreationTimestamp + id sinh client-side.
        return toResponse(employeeRepository.saveAndFlush(employee));
    }

    @Transactional
    public EmployeeResponse update(UUID id, UpdateEmployeeRequest request) {
        Employee employee = findOrThrow(id);
        Team team = findTeamOrThrow(request.teamId());
        User user = resolveUser(request.userId());
        if (request.userId() != null && employeeRepository.existsByUserIdAndIdNot(request.userId(), id)) {
            throw new ConflictException("User id=" + request.userId() + " đã gắn với 1 nhân viên khác");
        }

        employee.setFullName(request.fullName());
        employee.setTeam(team);
        employee.setStatus(request.status());
        employee.setUser(user);
        updateSpouse(employee, request.spouseEmployeeId());
        return toResponse(employeeRepository.save(employee));
    }

    // Quan hệ vợ/chồng đối xứng (CLAUDE.md §5) — set/gỡ luôn đồng bộ cả 2 chiều trong cùng
    // transaction, để ScanBatchService chỉ cần đọc employees.spouse_employee_id của 1 bên là đủ suy
    // ra bên kia, không cần join/suy luận thêm.
    private void updateSpouse(Employee employee, UUID newSpouseId) {
        Employee currentSpouse = employee.getSpouseEmployee();
        UUID currentSpouseId = currentSpouse == null ? null : currentSpouse.getId();
        if (Objects.equals(currentSpouseId, newSpouseId)) {
            return; // không đổi
        }
        if (newSpouseId != null && newSpouseId.equals(employee.getId())) {
            throw new InvalidRequestException("Không thể khai báo vợ/chồng là chính nhân viên này");
        }

        // Gỡ liên kết cũ (nếu có) ở cả 2 chiều trước khi gán liên kết mới.
        if (currentSpouse != null) {
            currentSpouse.setSpouseEmployee(null);
            employeeRepository.save(currentSpouse);
        }

        if (newSpouseId == null) {
            employee.setSpouseEmployee(null);
            return;
        }

        Employee newSpouse = findOrThrow(newSpouseId);
        if (newSpouse.getSpouseEmployee() != null && !newSpouse.getSpouseEmployee().getId().equals(employee.getId())) {
            throw new ConflictException("Nhân viên id=" + newSpouseId
                    + " đã được khai báo vợ/chồng với người khác — gỡ quan hệ cũ trước khi gán mới");
        }
        employee.setSpouseEmployee(newSpouse);
        newSpouse.setSpouseEmployee(employee);
        employeeRepository.save(newSpouse);
    }

    private User resolveUser(UUID userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy user với id=" + userId));
    }

    private Team findTeamOrThrow(UUID teamId) {
        return teamRepository.findById(teamId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy Tổ với id=" + teamId));
    }

    private Employee findOrThrow(UUID id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy nhân viên với id=" + id));
    }

    private EmployeeResponse toResponse(Employee employee) {
        User user = employee.getUser();
        Employee spouse = employee.getSpouseEmployee();
        return new EmployeeResponse(
                employee.getId(),
                employee.getFullName(),
                employee.getTeam().getId(),
                employee.getTeam().getName(),
                user == null ? null : user.getId(),
                employee.getStatus().name(),
                spouse == null ? null : spouse.getId(),
                spouse == null ? null : spouse.getFullName(),
                employee.getCreatedAt());
    }
}
