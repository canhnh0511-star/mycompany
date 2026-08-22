package com.mycompany.api.repository;

import com.mycompany.api.entity.ImageStatus;
import com.mycompany.api.entity.ScanImage;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScanImageRepository extends JpaRepository<ScanImage, UUID> {

    List<ScanImage> findByScanBatchId(UUID scanBatchId);

    List<ScanImage> findByScanBatchIdAndStatus(UUID scanBatchId, ImageStatus status);

    // Dedup retry-upload (RULE 4) — client gửi lại đúng clientImageId khi network lỗi giữa chừng.
    Optional<ScanImage> findByClientImageId(String clientImageId);

    List<ScanImage> findByPendingMoveTargetBatchId(UUID pendingMoveTargetBatchId);
}
