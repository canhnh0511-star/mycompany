package com.mycompany.api.service;

import com.mycompany.api.dto.LatexSaleReportResponse;
import com.mycompany.api.dto.LatexSaleReportRow;
import com.mycompany.api.dto.ProductionReportResponse;
import com.mycompany.api.dto.ProductionReportRow;
import com.mycompany.api.dto.ProductionReportTeamSubtotal;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.openpdf.text.Document;
import org.openpdf.text.DocumentException;
import org.openpdf.text.Font;
import org.openpdf.text.PageSize;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.BaseFont;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

/**
 * Xuất report (docs/TASKS.md Phase 4) ra PDF bằng OpenPDF (package org.openpdf.text.* — bản 3.x, đổi
 * từ com.lowagie.text.* cũ). Nhận thẳng DTO đã tính sẵn từ {@link ReportService}, KHÔNG query lại DB.
 *
 * <p><b>Bắt buộc nhúng font Unicode</b> — font mặc định (Helvetica) KHÔNG có dấu tiếng Việt, chữ sẽ ra
 * ô vuông/mất chữ. Nhúng {@code fonts/NotoSans-Regular.ttf} (SIL Open Font License, nhúng được) qua
 * classpath bằng overload {@code createFont(name, encoding, embedded, cached, ttfAfm bytes, pfb)} —
 * overload nhận path string thường KHÔNG hoạt động khi app đóng gói trong jar (không phải file thật
 * trên đĩa), phải nạp bytes trực tiếp.
 */
@Service
public class PdfReportExportService {

    private static final String FONT_RESOURCE = "/fonts/NotoSans-Regular.ttf";

    private final Font titleFont;
    private final Font headerFont;
    private final Font cellFont;
    private final Font boldCellFont;

    public PdfReportExportService() {
        BaseFont baseFont = loadEmbeddedFont();
        this.titleFont = new Font(baseFont, 14, Font.BOLD);
        this.headerFont = new Font(baseFont, 9, Font.BOLD);
        this.cellFont = new Font(baseFont, 9, Font.NORMAL);
        this.boldCellFont = new Font(baseFont, 9, Font.BOLD);
    }

    public byte[] exportProductionReport(ProductionReportResponse report) {
        int columnCount = report.latexTypeCodes().size() + 3; // Tổ, Nhân viên, ...loại mủ, Tổng
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4.rotate(), 24, 24, 36, 24);
            PdfWriter.getInstance(document, out);
            document.open();
            document.add(new Paragraph(
                    "Báo cáo sản lượng cá nhân (" + report.fromDate() + " → " + report.toDate() + ")", titleFont));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(columnCount);
            table.setWidthPercentage(100);
            addHeaderCell(table, "Tổ");
            addHeaderCell(table, "Nhân viên");
            for (String code : report.latexTypeCodes()) {
                addHeaderCell(table, report.latexTypeLabels().get(code));
            }
            addHeaderCell(table, "Tổng (kg)");

            for (ProductionReportTeamSubtotal subtotal : report.teamSubtotals()) {
                List<ProductionReportRow> teamRows = report.rows().stream()
                        .filter(r -> r.teamId().equals(subtotal.teamId()))
                        .toList();
                for (ProductionReportRow r : teamRows) {
                    addCell(table, r.teamName(), false);
                    addCell(table, r.employeeName(), false);
                    for (String code : report.latexTypeCodes()) {
                        addCell(table, formatKg(r.kgByLatexType().get(code)), false);
                    }
                    addCell(table, formatKg(r.totalKg()), false);
                }
                addCell(table, "Cộng Tổ " + subtotal.teamName(), true);
                addCell(table, "", true);
                for (String code : report.latexTypeCodes()) {
                    addCell(table, formatKg(subtotal.kgByLatexType().get(code)), true);
                }
                addCell(table, formatKg(subtotal.totalKg()), true);
            }

            addCell(table, "TỔNG CỘNG", true);
            addCell(table, "", true);
            for (String code : report.latexTypeCodes()) {
                addCell(table, formatKg(report.grandTotalByLatexType().get(code)), true);
            }
            addCell(table, formatKg(report.grandTotalKg()), true);

            document.add(table);
            document.close();
            return out.toByteArray();
        } catch (DocumentException e) {
            throw new IllegalStateException("Không tạo được file PDF report sản lượng", e);
        }
    }

    public byte[] exportLatexSaleReport(LatexSaleReportResponse report) {
        int columnCount = report.latexTypeCodes().size() + 2; // Tổ, ...loại mủ, Tổng
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4.rotate(), 24, 24, 36, 24);
            PdfWriter.getInstance(document, out);
            document.open();
            document.add(new Paragraph(
                    "Báo cáo bán mủ theo Tổ (" + report.fromDate() + " → " + report.toDate() + ")", titleFont));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(columnCount);
            table.setWidthPercentage(100);
            addHeaderCell(table, "Tổ");
            for (String code : report.latexTypeCodes()) {
                addHeaderCell(table, report.latexTypeLabels().get(code));
            }
            addHeaderCell(table, "Tổng (kg)");

            for (LatexSaleReportRow r : report.rows()) {
                addCell(table, r.teamName(), false);
                for (String code : report.latexTypeCodes()) {
                    addCell(table, formatKg(r.kgByLatexType().get(code)), false);
                }
                addCell(table, formatKg(r.totalKg()), false);
            }

            addCell(table, "TỔNG CỘNG", true);
            for (String code : report.latexTypeCodes()) {
                addCell(table, formatKg(report.grandTotalByLatexType().get(code)), true);
            }
            addCell(table, formatKg(report.grandTotalKg()), true);

            document.add(table);
            document.close();
            return out.toByteArray();
        } catch (DocumentException e) {
            throw new IllegalStateException("Không tạo được file PDF report bán mủ", e);
        }
    }

    private void addHeaderCell(PdfPTable table, String text) {
        table.addCell(new PdfPCell(new Phrase(text, headerFont)));
    }

    private void addCell(PdfPTable table, String text, boolean bold) {
        table.addCell(new PdfPCell(new Phrase(text, bold ? boldCellFont : cellFont)));
    }

    private String formatKg(BigDecimal kg) {
        return kg == null ? BigDecimal.ZERO.setScale(2).toString() : kg.setScale(2, RoundingMode.HALF_UP).toString();
    }

    private BaseFont loadEmbeddedFont() {
        try (InputStream in = getClass().getResourceAsStream(FONT_RESOURCE)) {
            if (in == null) {
                throw new IllegalStateException("Không tìm thấy font " + FONT_RESOURCE + " trong classpath");
            }
            byte[] fontBytes = in.readAllBytes();
            return BaseFont.createFont(
                    "NotoSans-Regular.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, fontBytes, null);
        } catch (IOException e) {
            throw new UncheckedIOException("Không đọc được font " + FONT_RESOURCE + " từ classpath", e);
        } catch (DocumentException e) {
            throw new IllegalStateException("Không nạp được font Unicode cho PDF export", e);
        }
    }
}
