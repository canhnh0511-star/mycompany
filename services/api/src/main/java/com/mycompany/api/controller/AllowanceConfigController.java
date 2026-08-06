package com.mycompany.api.controller;

import com.mycompany.api.dto.AllowanceConfigResponse;
import com.mycompany.api.dto.CreateAllowanceConfigRequest;
import com.mycompany.api.dto.UpdateAllowanceConfigRequest;
import com.mycompany.api.service.AllowanceConfigService;
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

/** Không có DELETE — giữ lịch sử phụ cấp (time-versioned), xem AllowanceConfigService. */
@RestController
@RequestMapping("/api/v1/allowance-configs")
@RequiredArgsConstructor
public class AllowanceConfigController {

    private final AllowanceConfigService allowanceConfigService;

    @GetMapping
    public List<AllowanceConfigResponse> list(@RequestParam(required = false) String code) {
        return allowanceConfigService.list(code);
    }

    @GetMapping("/{id}")
    public AllowanceConfigResponse get(@PathVariable UUID id) {
        return allowanceConfigService.get(id);
    }

    @PostMapping
    public ResponseEntity<AllowanceConfigResponse> create(@Valid @RequestBody CreateAllowanceConfigRequest request) {
        AllowanceConfigResponse created = allowanceConfigService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{id}")
    public AllowanceConfigResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateAllowanceConfigRequest request) {
        return allowanceConfigService.update(id, request);
    }
}
