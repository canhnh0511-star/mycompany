package com.mycompany.api.service;

import com.mycompany.api.dto.LatexSaleReportResponse;
import com.mycompany.api.dto.LatexSaleReportRow;
import com.mycompany.api.dto.ProductionReportResponse;
import com.mycompany.api.dto.ProductionReportRow;
import com.mycompany.api.dto.ProductionReportTeamSubtotal;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.util.List;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

/**
 * Xuất report (docs/TASKS.md Phase 4) ra Excel bằng Apache POI — nhận thẳng DTO đã tính sẵn từ
 * {@link ReportService}, KHÔNG query lại DB. Cột theo latexTypeCodes/latexTypeLabels của report (ổn
 * định theo danh mục LatexType, kể cả loại mủ không phát sinh trong kỳ).
 */
@Service
public class ExcelReportExportService {

    public byte[] exportProductionReport(ProductionReportResponse report) {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("San luong");
            CellStyle headerStyle = boldStyle(workbook);
            CellStyle totalStyle = boldStyle(workbook);

            int rowIdx = 0;
            Row header = sheet.createRow(rowIdx++);
            int col = 0;
            writeCell(header, col++, "Tổ", headerStyle);
            writeCell(header, col++, "Nhân viên", headerStyle);
            for (String code : report.latexTypeCodes()) {
                writeCell(header, col++, report.latexTypeLabels().get(code), headerStyle);
            }
            writeCell(header, col, "Tổng (kg)", headerStyle);

            for (ProductionReportTeamSubtotal subtotal : report.teamSubtotals()) {
                List<ProductionReportRow> teamRows = report.rows().stream()
                        .filter(r -> r.teamId().equals(subtotal.teamId()))
                        .toList();
                for (ProductionReportRow r : teamRows) {
                    Row row = sheet.createRow(rowIdx++);
                    int c = 0;
                    writeCell(row, c++, r.teamName(), null);
                    writeCell(row, c++, r.employeeName(), null);
                    for (String code : report.latexTypeCodes()) {
                        writeCell(row, c++, r.kgByLatexType().getOrDefault(code, BigDecimal.ZERO), null);
                    }
                    writeCell(row, c, r.totalKg(), null);
                }
                Row subtotalRow = sheet.createRow(rowIdx++);
                int c = 0;
                writeCell(subtotalRow, c++, "Cộng Tổ " + subtotal.teamName(), totalStyle);
                writeCell(subtotalRow, c++, "", totalStyle);
                for (String code : report.latexTypeCodes()) {
                    writeCell(subtotalRow, c++, subtotal.kgByLatexType().getOrDefault(code, BigDecimal.ZERO), totalStyle);
                }
                writeCell(subtotalRow, c, subtotal.totalKg(), totalStyle);
            }

            Row grandRow = sheet.createRow(rowIdx);
            int c = 0;
            writeCell(grandRow, c++, "TỔNG CỘNG", totalStyle);
            writeCell(grandRow, c++, "", totalStyle);
            for (String code : report.latexTypeCodes()) {
                writeCell(grandRow, c++, report.grandTotalByLatexType().getOrDefault(code, BigDecimal.ZERO), totalStyle);
            }
            writeCell(grandRow, c, report.grandTotalKg(), totalStyle);

            autoSizeColumns(sheet, report.latexTypeCodes().size() + 3);
            return toBytes(workbook);
        } catch (IOException e) {
            throw new UncheckedIOException("Không tạo được file Excel report sản lượng", e);
        }
    }

    public byte[] exportLatexSaleReport(LatexSaleReportResponse report) {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Ban mu");
            CellStyle headerStyle = boldStyle(workbook);
            CellStyle totalStyle = boldStyle(workbook);

            int rowIdx = 0;
            Row header = sheet.createRow(rowIdx++);
            int col = 0;
            writeCell(header, col++, "Tổ", headerStyle);
            for (String code : report.latexTypeCodes()) {
                writeCell(header, col++, report.latexTypeLabels().get(code), headerStyle);
            }
            writeCell(header, col, "Tổng (kg)", headerStyle);

            for (LatexSaleReportRow r : report.rows()) {
                Row row = sheet.createRow(rowIdx++);
                int c = 0;
                writeCell(row, c++, r.teamName(), null);
                for (String code : report.latexTypeCodes()) {
                    writeCell(row, c++, r.kgByLatexType().getOrDefault(code, BigDecimal.ZERO), null);
                }
                writeCell(row, c, r.totalKg(), null);
            }

            Row grandRow = sheet.createRow(rowIdx);
            int c = 0;
            writeCell(grandRow, c++, "TỔNG CỘNG", totalStyle);
            for (String code : report.latexTypeCodes()) {
                writeCell(grandRow, c++, report.grandTotalByLatexType().getOrDefault(code, BigDecimal.ZERO), totalStyle);
            }
            writeCell(grandRow, c, report.grandTotalKg(), totalStyle);

            autoSizeColumns(sheet, report.latexTypeCodes().size() + 2);
            return toBytes(workbook);
        } catch (IOException e) {
            throw new UncheckedIOException("Không tạo được file Excel report bán mủ", e);
        }
    }

    private CellStyle boldStyle(XSSFWorkbook workbook) {
        Font boldFont = workbook.createFont();
        boldFont.setBold(true);
        CellStyle style = workbook.createCellStyle();
        style.setFont(boldFont);
        return style;
    }

    private void writeCell(Row row, int col, Object value, CellStyle style) {
        Cell cell = row.createCell(col);
        if (value instanceof BigDecimal bd) {
            cell.setCellValue(bd.doubleValue());
        } else {
            cell.setCellValue(String.valueOf(value));
        }
        if (style != null) {
            cell.setCellStyle(style);
        }
    }

    private void autoSizeColumns(Sheet sheet, int columnCount) {
        for (int i = 0; i < columnCount; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private byte[] toBytes(XSSFWorkbook workbook) throws IOException {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            workbook.write(out);
            return out.toByteArray();
        }
    }
}
