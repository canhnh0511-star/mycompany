package com.mycompany.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Danh mục MỞ — hiện có 4 loại (water|cup|strip|coagulated), không giả định cố định vĩnh viễn.
 * Xem docs/adr/0002-normalize-latex-type-storage.md.
 */
@Entity
@Table(name = "latex_types")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class LatexType {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 20)
    private String code; // water | cup | strip | coagulated

    @Column(nullable = false, length = 50)
    private String label; // Mủ nước | Mủ chén | Mủ dây | Mủ đông

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String unit = "kg";
}
