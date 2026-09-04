package com.mycompany.api.controller;

import com.mycompany.api.dto.CreateTechnicalGradeConfigRequest;
import com.mycompany.api.dto.TechnicalGradeConfigResponse;
import com.mycompany.api.dto.UpdateTechnicalGradeConfigRequest;
import com.mycompany.api.entity.TechnicalGrade;
import com.mycompany.api.service.TechnicalGradeConfigService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** "Hạng kỹ thuật" (Module 3 — Bảng lương). Không có DELETE — giữ lịch sử đơn giá (time-versioned). */
@RestController
@RequestMapping("/api/v1/technical-grade-configs")
@RequiredArgsConstructor
public class TechnicalGradeConfigController {

    private final TechnicalGradeConfigService service;

    @GetMapping
    public List<TechnicalGradeConfigResponse> list(@RequestParam(required = false) TechnicalGrade grade) {
        return service.list(grade);
    }

    @GetMapping("/{id}")
    public TechnicalGradeConfigResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    public ResponseEntity<TechnicalGradeConfigResponse> create(@Valid @RequestBody CreateTechnicalGradeConfigRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PatchMapping("/{id}")
    public TechnicalGradeConfigResponse update(
            @PathVariable UUID id, @Valid @RequestBody UpdateTechnicalGradeConfigRequest request) {
        return service.update(id, request);
    }
}
