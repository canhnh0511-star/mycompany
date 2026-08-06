package com.mycompany.api.controller;

import com.mycompany.api.dto.CreateTeamRequest;
import com.mycompany.api.dto.TeamResponse;
import com.mycompany.api.dto.UpdateTeamRequest;
import com.mycompany.api.service.TeamService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Không có DELETE — xem TeamService. */
@RestController
@RequestMapping("/api/v1/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @GetMapping
    public List<TeamResponse> list() {
        return teamService.list();
    }

    @GetMapping("/{id}")
    public TeamResponse get(@PathVariable UUID id) {
        return teamService.get(id);
    }

    @PostMapping
    public ResponseEntity<TeamResponse> create(@Valid @RequestBody CreateTeamRequest request) {
        TeamResponse created = teamService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{id}")
    public TeamResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateTeamRequest request) {
        return teamService.update(id, request);
    }
}
