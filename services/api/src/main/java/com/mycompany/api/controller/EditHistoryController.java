package com.mycompany.api.controller;

import com.mycompany.api.dto.EditHistoryResponse;
import com.mycompany.api.service.EditHistoryService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Đọc edit_history — polymorphic theo tableName+recordId (CLAUDE.md §4, docs/TASKS.md Phase 4). */
@RestController
@RequestMapping("/api/v1/edit-history")
@RequiredArgsConstructor
public class EditHistoryController {

    private final EditHistoryService editHistoryService;

    @GetMapping
    public List<EditHistoryResponse> list(@RequestParam String tableName, @RequestParam UUID recordId) {
        return editHistoryService.list(tableName, recordId);
    }
}
