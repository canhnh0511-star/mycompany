package com.mycompany.api.service;

import com.mycompany.api.dto.CreateEmployeeRequest;
import com.mycompany.api.dto.EmployeeResponse;
import com.mycompany.api.dto.UpdateEmployeeRequest;
import com.mycompany.api.entity.Employee;
import com.mycompany.api.entity.EmployeeStatus;
import com.mycompany.api.entity.Team;
import com.mycompany.api.entity.User;
import com.mycompany.api.exception.ConflictException;
import com.mycompany.api.repository.EmployeeRepository;
import com.mycompany.api.repository.TeamRepository;
import com.mycompany.api.repository.UserRepository;
import java.util.List;
import java.util.NoSuchElementException;
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
        return toResponse(employeeRepository.save(employee));
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
        return new EmployeeResponse(
                employee.getId(),
                employee.getFullName(),
                employee.getTeam().getId(),
                employee.getTeam().getName(),
                user == null ? null : user.getId(),
                employee.getStatus().name(),
                employee.getCreatedAt());
    }
}
