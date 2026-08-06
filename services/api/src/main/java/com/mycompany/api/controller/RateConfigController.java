package com.mycompany.api.controller;

import com.mycompany.api.dto.CreateRateConfigRequest;
import com.mycompany.api.dto.RateConfigResponse;
import com.mycompany.api.dto.UpdateRateConfigRequest;
import com.mycompany.api.service.RateConfigService;
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

/** Không có DELETE — giữ lịch sử đơn giá (time-versioned), xem RateConfigService. */
@RestController
@RequestMapping("/api/v1/rate-configs")
@RequiredArgsConstructor
public class RateConfigController {

    private final RateConfigService rateConfigService;

    @GetMapping
    public List<RateConfigResponse> list(@RequestParam(required = false) UUID latexTypeId) {
        return rateConfigService.list(latexTypeId);
    }

    @GetMapping("/{id}")
    public RateConfigResponse get(@PathVariable UUID id) {
        return rateConfigService.get(id);
    }

    @PostMapping
    public ResponseEntity<RateConfigResponse> create(@Valid @RequestBody CreateRateConfigRequest request) {
        RateConfigResponse created = rateConfigService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{id}")
    public RateConfigResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateRateConfigRequest request) {
        return rateConfigService.update(id, request);
    }
}
