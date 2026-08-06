package com.mycompany.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Polymorphic (tableName + recordId). Chỉ ghi các lần SỬA sau khi bản ghi đã tồn tại (không ghi sự
 * kiện tạo mới). Ghi ở mức AGGREGATE: old_data/new_data snapshot toàn bộ record + tất cả items liên
 * quan (không tách riêng theo từng item) — phục vụ đối chiếu tranh chấp cần xem toàn cảnh.
 * oldData/newData lưu dạng chuỗi JSON thô (service layer serialize/deserialize bằng Jackson);
 * {@code @JdbcTypeCode(SqlTypes.JSON)} map thẳng sang cột jsonb của Postgres.
 */
@Entity
@Table(name = "edit_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class EditHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // 'production_records' | 'latex_sales' | 'attendance_records' — luôn trỏ vào bảng header
    @Column(name = "table_name", nullable = false, length = 50)
    private String tableName;

    @Column(name = "record_id", nullable = false)
    private UUID recordId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "edited_by", nullable = false)
    private User editedBy;

    @CreationTimestamp
    @Column(name = "edited_at", nullable = false, updatable = false)
    private Instant editedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "old_data")
    private String oldData;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "new_data")
    private String newData;
}
