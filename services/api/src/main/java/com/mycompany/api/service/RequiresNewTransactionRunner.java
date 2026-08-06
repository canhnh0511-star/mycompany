package com.mycompany.api.service;

import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Chạy 1 block trong transaction RIÊNG (PROPAGATION_REQUIRES_NEW) — dùng cho nhập liệu batch
 * best-effort theo từng dòng (docs/adr/0007-batch-manual-entry-best-effort.md): 1 dòng lỗi chỉ
 * rollback đúng dòng đó, KHÔNG kéo theo rollback các dòng khác đã lưu thành công trước đó trong cùng
 * request — khác với 1 @Transactional method-level bao quanh cả vòng lặp, nơi 1 exception sẽ đánh dấu
 * rollback-only cho toàn bộ transaction.
 */
@Component
@RequiredArgsConstructor
public class RequiresNewTransactionRunner {

    private final PlatformTransactionManager transactionManager;

    public <T> T run(Supplier<T> action) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return template.execute(status -> action.get());
    }
}
