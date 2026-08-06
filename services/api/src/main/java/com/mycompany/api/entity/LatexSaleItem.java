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
import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Chi tiết khối lượng theo từng loại mủ trong 1 {@link LatexSale}, cùng mô hình với ProductionRecordItem. */
@Entity
@Table(name = "latex_sale_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class LatexSaleItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "latex_sale_id", nullable = false)
    private LatexSale latexSale;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "latex_type_id", nullable = false)
    private LatexType latexType;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal kg;

    // CHỈ có giá trị khi latexType.code = "water"
    @Column(name = "drc_percent", precision = 5, scale = 2)
    private BigDecimal drcPercent;
}
