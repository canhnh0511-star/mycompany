package com.mycompany.api.controller;

import com.mycompany.api.dto.LatexSaleReportResponse;
import com.mycompany.api.dto.ProductionReportResponse;
import com.mycompany.api.service.ExcelReportExportService;
import com.mycompany.api.service.PdfReportExportService;
import com.mycompany.api.service.ReportService;
import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Báo cáo tổng hợp (docs/TASKS.md Phase 4) — CHỈ tính bản ghi CONFIRMED (xem ReportService). Export
 * Excel/PDF (`/export/xlsx`, `/export/pdf`) gọi lại ReportService để lấy DTO rồi đưa qua exporter
 * tương ứng — KHÔNG query lại DB.
 */
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private static final MediaType XLSX_MEDIA_TYPE =
            MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final ReportService reportService;
    private final ExcelReportExportService excelReportExportService;
    private final PdfReportExportService pdfReportExportService;

    @GetMapping("/production-records")
    public ProductionReportResponse productionReport(
            @RequestParam LocalDate fromDate, @RequestParam LocalDate toDate,
            @RequestParam(required = false) UUID teamId, @RequestParam(required = false) UUID employeeId) {
        return reportService.productionReport(fromDate, toDate, teamId, employeeId);
    }

    @GetMapping("/latex-sales")
    public LatexSaleReportResponse latexSaleReport(
            @RequestParam LocalDate fromDate, @RequestParam LocalDate toDate,
            @RequestParam(required = false) UUID teamId) {
        return reportService.latexSaleReport(fromDate, toDate, teamId);
    }

    @GetMapping("/production-records/export/xlsx")
    public ResponseEntity<byte[]> exportProductionXlsx(
            @RequestParam LocalDate fromDate, @RequestParam LocalDate toDate,
            @RequestParam(required = false) UUID teamId, @RequestParam(required = false) UUID employeeId) {
        ProductionReportResponse report = reportService.productionReport(fromDate, toDate, teamId, employeeId);
        byte[] file = excelReportExportService.exportProductionReport(report);
        return fileResponse(file, XLSX_MEDIA_TYPE, fileName("san-luong", fromDate, toDate, "xlsx"));
    }

    @GetMapping("/production-records/export/pdf")
    public ResponseEntity<byte[]> exportProductionPdf(
            @RequestParam LocalDate fromDate, @RequestParam LocalDate toDate,
            @RequestParam(required = false) UUID teamId, @RequestParam(required = false) UUID employeeId) {
        ProductionReportResponse report = reportService.productionReport(fromDate, toDate, teamId, employeeId);
        byte[] file = pdfReportExportService.exportProductionReport(report);
        return fileResponse(file, MediaType.APPLICATION_PDF, fileName("san-luong", fromDate, toDate, "pdf"));
    }

    @GetMapping("/latex-sales/export/xlsx")
    public ResponseEntity<byte[]> exportLatexSaleXlsx(
            @RequestParam LocalDate fromDate, @RequestParam LocalDate toDate,
            @RequestParam(required = false) UUID teamId) {
        LatexSaleReportResponse report = reportService.latexSaleReport(fromDate, toDate, teamId);
        byte[] file = excelReportExportService.exportLatexSaleReport(report);
        return fileResponse(file, XLSX_MEDIA_TYPE, fileName("ban-mu", fromDate, toDate, "xlsx"));
    }

    @GetMapping("/latex-sales/export/pdf")
    public ResponseEntity<byte[]> exportLatexSalePdf(
            @RequestParam LocalDate fromDate, @RequestParam LocalDate toDate,
            @RequestParam(required = false) UUID teamId) {
        LatexSaleReportResponse report = reportService.latexSaleReport(fromDate, toDate, teamId);
        byte[] file = pdfReportExportService.exportLatexSaleReport(report);
        return fileResponse(file, MediaType.APPLICATION_PDF, fileName("ban-mu", fromDate, toDate, "pdf"));
    }

    private ResponseEntity<byte[]> fileResponse(byte[] file, MediaType mediaType, String fileName) {
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .body(file);
    }

    private String fileName(String prefix, LocalDate fromDate, LocalDate toDate, String ext) {
        return prefix + "_" + fromDate + "_den_" + toDate + "." + ext;
    }
}
