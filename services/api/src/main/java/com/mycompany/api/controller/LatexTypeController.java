package com.mycompany.api.controller;

import com.mycompany.api.dto.CreateLatexTypeRequest;
import com.mycompany.api.dto.LatexTypeResponse;
import com.mycompany.api.dto.UpdateLatexTypeRequest;
import com.mycompany.api.service.LatexTypeService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/latex-types")
@RequiredArgsConstructor
public class LatexTypeController {

    private final LatexTypeService latexTypeService;

    @GetMapping
    public List<LatexTypeResponse> list() {
        return latexTypeService.list();
    }

    @GetMapping("/{id}")
    public LatexTypeResponse get(@PathVariable UUID id) {
        return latexTypeService.get(id);
    }

    @PostMapping
    public ResponseEntity<LatexTypeResponse> create(@Valid @RequestBody CreateLatexTypeRequest request) {
        LatexTypeResponse created = latexTypeService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{id}")
    public LatexTypeResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateLatexTypeRequest request) {
        return latexTypeService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        latexTypeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
