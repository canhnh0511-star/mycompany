package com.mycompany.api.service;

import com.mycompany.api.dto.CreateTeamRequest;
import com.mycompany.api.dto.TeamResponse;
import com.mycompany.api.dto.UpdateTeamRequest;
import com.mycompany.api.entity.Team;
import com.mycompany.api.repository.TeamRepository;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** KHÔNG có delete ở v1 — Team được tham chiếu bởi employees/production_records/latex_sales (CLAUDE.md §4). */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TeamService {

    private final TeamRepository teamRepository;

    public List<TeamResponse> list() {
        return teamRepository.findAll().stream().map(this::toResponse).toList();
    }

    public TeamResponse get(UUID id) {
        return toResponse(findOrThrow(id));
    }

    @Transactional
    public TeamResponse create(CreateTeamRequest request) {
        Team team = Team.builder()
                .name(request.name())
                .description(request.description())
                .build();
        // saveAndFlush (không phải save) — id sinh client-side (GenerationType.UUID) nên Hibernate mặc
        // định trì hoãn INSERT tới lúc commit; phải flush ngay để @CreationTimestamp có giá trị trước
        // khi map sang response, nếu không createdAt sẽ null trong response của chính request tạo này.
        return toResponse(teamRepository.saveAndFlush(team));
    }

    @Transactional
    public TeamResponse update(UUID id, UpdateTeamRequest request) {
        Team team = findOrThrow(id);
        team.setName(request.name());
        team.setDescription(request.description());
        return toResponse(teamRepository.save(team));
    }

    private Team findOrThrow(UUID id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy Tổ với id=" + id));
    }

    private TeamResponse toResponse(Team team) {
        return new TeamResponse(team.getId(), team.getName(), team.getDescription(), team.getCreatedAt());
    }
}
