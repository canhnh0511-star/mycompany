package com.mycompany.api.service;

import com.mycompany.api.dto.PayrollRateSnapshot;
import com.mycompany.api.dto.PayrollRowResponse;
import com.mycompany.api.dto.PayrollRowStatus;
import com.mycompany.api.dto.PayrollSummaryResponse;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.CellReference;
import org.apache.poi.ss.util.WorkbookUtil;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

/**
 * Xuất Bảng lương ra Excel — MỖI TỔ 1 SHEET (phản hồi trực tiếp), cộng 1 sheet "Tổng hợp" đầu
 * workbook tham chiếu công thức sang các sheet Tổ. Nhận thẳng {@link PayrollSummaryResponse} +
 * {@link PayrollRateSnapshot} đã tính sẵn từ {@link PayrollService} — KHÔNG query lại DB.
 *
 * <p><b>Công thức, không phải số tĩnh</b> (phản hồi trực tiếp: "đảm bảo các cột đều có công thức")
 * — mỗi sheet Tổ mở đầu bằng 1 bảng đơn giá tường minh (đơn giá mủ nước/mủ tạp/phụ cấp.../hạng kỹ
 * thuật đã dùng để tính tháng này, xem {@link PayrollRateSnapshot}); MỌI cột "Thành tiền" của từng
 * nhân viên là công thức {@code = <số lượng> * <ô đơn giá tham chiếu>} (tham chiếu tuyệt đối $, copy
 * dòng vẫn đúng), "Tổng lương" = SUM các cột thành tiền, "Thực lãnh" = Tổng lương − Trừ, dòng
 * "TỔNG CỘNG" cuối mỗi sheet = SUM cột tương ứng của toàn bộ nhân viên. Cột STT/Họ tên/Hạng kỹ thuật/
 * Trạng thái là dữ liệu ĐẦU VÀO (không phải kết quả tính), giữ nguyên dạng giá trị — không có "công
 * thức" nào có ý nghĩa cho các cột này. "Trừ/tạm ứng" tự động (không override) cũng là công thức
 * tham chiếu ô "Mức trừ mặc định" ở bảng đơn giá — chỉ ghi số tĩnh khi Admin đã áp mức riêng cho đúng
 * nhân viên đó (giá trị đã CHỌN, không phải suy ra được từ công thức nào khác).
 */
@Service
public class PayrollExcelExportService {

    private static final DateTimeFormatter MONTH_LABEL = DateTimeFormatter.ofPattern("'Tháng' MM/yyyy");

    // Cột bảng dữ liệu chính (0-based) — đặt hằng số 1 chỗ để formula-building khỏi hardcode rải rác.
    private static final int C_STT = 0;
    private static final int C_NAME = 1;
    private static final int C_WATER_KG = 2;
    private static final int C_WATER_AMOUNT = 3;
    private static final int C_MIXED_KG = 4;
    private static final int C_MIXED_AMOUNT = 5;
    private static final int C_MEDICATION_QTY = 6;
    private static final int C_MEDICATION_AMOUNT = 7;
    private static final int C_ATTENDANCE_QTY = 8;
    private static final int C_ATTENDANCE_AMOUNT = 9;
    private static final int C_STORM_QTY = 10;
    private static final int C_STORM_AMOUNT = 11;
    private static final int C_SEASONAL_QTY = 12;
    private static final int C_SEASONAL_AMOUNT = 13;
    private static final int C_GRADE = 14;
    private static final int C_GRADE_AMOUNT = 15;
    private static final int C_TOTAL_PAY = 16;
    private static final int C_DEDUCTION = 17;
    private static final int C_NET_PAY = 18;
    private static final int C_STATUS = 19;
    private static final int COLUMN_COUNT = 20;

    public byte[] exportPayroll(PayrollSummaryResponse summary, PayrollRateSnapshot rates, String yearMonth) {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Styles styles = new Styles(workbook);
            String monthLabel = YearMonth.parse(yearMonth).format(MONTH_LABEL);

            // Giữ nguyên thứ tự Tổ đã sort sẵn theo tên ở PayrollService.summary() (teamName rồi
            // employeeName) — LinkedHashMap để KHÔNG tự sắp xếp lại lần 2.
            Map<String, List<PayrollRowResponse>> byTeam = summary.rows().stream()
                    .collect(Collectors.groupingBy(PayrollRowResponse::teamName, LinkedHashMap::new, Collectors.toList()));

            Map<String, TeamSheetRef> refByTeam = new LinkedHashMap<>();
            Map<String, String> sheetNameByTeam = new LinkedHashMap<>();
            for (String teamName : byTeam.keySet()) {
                sheetNameByTeam.put(teamName, uniqueSheetName(workbook, teamName));
            }
            for (Map.Entry<String, List<PayrollRowResponse>> entry : byTeam.entrySet()) {
                String sheetName = sheetNameByTeam.get(entry.getKey());
                Sheet sheet = workbook.createSheet(sheetName);
                TeamSheetRef ref = writeTeamSheet(sheet, styles, entry.getKey(), entry.getValue(), rates, monthLabel);
                refByTeam.put(entry.getKey(), ref);
            }

            // Sheet "Tổng hợp" — tham chiếu CÔNG THỨC sang dòng TỔNG CỘNG của từng sheet Tổ đã tạo ở
            // trên (đã biết chắc số dòng vì tự viết ra), không phải copy số tĩnh sang đây.
            Sheet overview = workbook.createSheet(WorkbookUtil.createSafeSheetName("Tong hop"));
            writeOverviewSheet(overview, styles, refByTeam, sheetNameByTeam, monthLabel);
            workbook.setSheetOrder(overview.getSheetName(), 0);
            workbook.setActiveSheet(0);

            return toBytes(workbook);
        } catch (IOException e) {
            throw new UncheckedIOException("Không tạo được file Excel bảng lương", e);
        }
    }

    /** Vị trí dòng TỔNG CỘNG + tên cột tiền của 1 sheet Tổ — overview sheet cần để dựng công thức
     * tham chiếu chéo sheet (Excel formula: {@code ='<sheet>'!Q10}). */
    private record TeamSheetRef(int totalRowExcel, int employeeCount) {
    }

    private TeamSheetRef writeTeamSheet(Sheet sheet, Styles styles, String teamName,
            List<PayrollRowResponse> rows, PayrollRateSnapshot rates, String monthLabel) {
        int r = 0;

        Row titleRow = sheet.createRow(r);
        writeCell(titleRow, 0, "BẢNG LƯƠNG " + monthLabel.toUpperCase() + " — TỔ " + teamName.toUpperCase(), styles.title);
        sheet.addMergedRegion(new CellRangeAddress(r, r, 0, COLUMN_COUNT - 1));
        r++; // dòng trống
        r++;

        Row rateHeader = sheet.createRow(r);
        writeCell(rateHeader, 0, "ĐƠN GIÁ ÁP DỤNG (đã dùng để tính các công thức bên dưới)", styles.sectionHeader);
        sheet.addMergedRegion(new CellRangeAddress(r, r, 0, 3));
        r++;

        int waterRateRow = writeRateRow(sheet, styles, r++, "Mủ nước (đ/kg)", rates.waterRate());
        int mixedRateRow = writeRateRow(sheet, styles, r++, "Mủ tạp (đ/kg)", rates.mixedLatexRate());
        int medicationRateRow = writeRateRow(sheet, styles, r++, "Bồi thuốc (đ/lần)", rates.medicationRate());
        int attendanceRateRow = writeRateRow(sheet, styles, r++, "Chuyên cần (đ/ngày)", rates.attendanceRate());
        int stormRateRow = writeRateRow(sheet, styles, r++, "Công mưa bão (đ/ngày)", rates.stormRate());
        int seasonalRateRow = writeRateRow(sheet, styles, r++, "Công thời vụ (đ/ngày)", rates.seasonalRate());
        int gradeARow = writeRateRow(sheet, styles, r++, "Phụ cấp hạng A (đ/tháng)", rates.gradeRates().getOrDefault("A", BigDecimal.ZERO));
        int gradeBRow = writeRateRow(sheet, styles, r++, "Phụ cấp hạng B (đ/tháng)", rates.gradeRates().getOrDefault("B", BigDecimal.ZERO));
        int gradeCRow = writeRateRow(sheet, styles, r++, "Phụ cấp hạng C (đ/tháng)", rates.gradeRates().getOrDefault("C", BigDecimal.ZERO));
        int defaultAdvanceRow = writeRateRow(sheet, styles, r++, "Mức trừ/tạm ứng mặc định (đ)", rates.defaultAdvance());
        r++; // dòng trống trước bảng chính

        String waterRateRef = absRef(1, waterRateRow);
        String mixedRateRef = absRef(1, mixedRateRow);
        String medicationRateRef = absRef(1, medicationRateRow);
        String attendanceRateRef = absRef(1, attendanceRateRow);
        String stormRateRef = absRef(1, stormRateRow);
        String seasonalRateRef = absRef(1, seasonalRateRow);
        String gradeARef = absRef(1, gradeARow);
        String gradeBRef = absRef(1, gradeBRow);
        String gradeCRef = absRef(1, gradeCRow);
        String defaultAdvanceRef = absRef(1, defaultAdvanceRow);

        int headerRowIdx = r;
        Row header = sheet.createRow(r++);
        writeCell(header, C_STT, "STT", styles.tableHeader);
        writeCell(header, C_NAME, "Họ tên", styles.tableHeader);
        writeCell(header, C_WATER_KG, "Mủ nước (kg)", styles.tableHeader);
        writeCell(header, C_WATER_AMOUNT, "Thành tiền mủ nước", styles.tableHeader);
        writeCell(header, C_MIXED_KG, "Mủ tạp (kg)", styles.tableHeader);
        writeCell(header, C_MIXED_AMOUNT, "Thành tiền mủ tạp", styles.tableHeader);
        writeCell(header, C_MEDICATION_QTY, "Bồi thuốc (lần)", styles.tableHeader);
        writeCell(header, C_MEDICATION_AMOUNT, "Thành tiền bồi thuốc", styles.tableHeader);
        writeCell(header, C_ATTENDANCE_QTY, "Chuyên cần (ngày)", styles.tableHeader);
        writeCell(header, C_ATTENDANCE_AMOUNT, "Thành tiền chuyên cần", styles.tableHeader);
        writeCell(header, C_STORM_QTY, "Công mưa bão (ngày)", styles.tableHeader);
        writeCell(header, C_STORM_AMOUNT, "Thành tiền mưa bão", styles.tableHeader);
        writeCell(header, C_SEASONAL_QTY, "Công thời vụ (ngày)", styles.tableHeader);
        writeCell(header, C_SEASONAL_AMOUNT, "Thành tiền thời vụ", styles.tableHeader);
        writeCell(header, C_GRADE, "Hạng kỹ thuật", styles.tableHeader);
        writeCell(header, C_GRADE_AMOUNT, "Phụ cấp hạng KT", styles.tableHeader);
        writeCell(header, C_TOTAL_PAY, "Tổng lương", styles.tableHeader);
        writeCell(header, C_DEDUCTION, "Trừ / tạm ứng", styles.tableHeader);
        writeCell(header, C_NET_PAY, "Thực lãnh", styles.tableHeader);
        writeCell(header, C_STATUS, "Trạng thái dữ liệu", styles.tableHeader);

        int firstDataRowExcel = r + 1; // Excel 1-based, dòng nhân viên đầu tiên
        int stt = 1;
        for (PayrollRowResponse row : rows) {
            Row dataRow = sheet.createRow(r);
            int excelRow = r + 1;
            writeCell(dataRow, C_STT, stt++, styles.text);
            writeCell(dataRow, C_NAME, row.employeeName(), styles.text);
            writeCell(dataRow, C_WATER_KG, row.waterKg().doubleValue(), styles.qty);
            writeFormula(dataRow, C_WATER_AMOUNT, colRef(C_WATER_KG) + excelRow + "*" + waterRateRef, styles.money);
            writeCell(dataRow, C_MIXED_KG, row.mixedLatexKg().doubleValue(), styles.qty);
            writeFormula(dataRow, C_MIXED_AMOUNT, colRef(C_MIXED_KG) + excelRow + "*" + mixedRateRef, styles.money);
            writeCell(dataRow, C_MEDICATION_QTY, row.medicationCount().doubleValue(), styles.qty);
            writeFormula(dataRow, C_MEDICATION_AMOUNT, colRef(C_MEDICATION_QTY) + excelRow + "*" + medicationRateRef, styles.money);
            writeCell(dataRow, C_ATTENDANCE_QTY, row.attendanceDays().doubleValue(), styles.qty);
            writeFormula(dataRow, C_ATTENDANCE_AMOUNT, colRef(C_ATTENDANCE_QTY) + excelRow + "*" + attendanceRateRef, styles.money);
            writeCell(dataRow, C_STORM_QTY, row.stormAllowanceDays().doubleValue(), styles.qty);
            writeFormula(dataRow, C_STORM_AMOUNT, colRef(C_STORM_QTY) + excelRow + "*" + stormRateRef, styles.money);
            writeCell(dataRow, C_SEASONAL_QTY, row.seasonalWorkDays().doubleValue(), styles.qty);
            writeFormula(dataRow, C_SEASONAL_AMOUNT, colRef(C_SEASONAL_QTY) + excelRow + "*" + seasonalRateRef, styles.money);
            writeCell(dataRow, C_GRADE, row.technicalGrade() == null ? "" : row.technicalGrade(), styles.text);
            String gradeCell = colRef(C_GRADE) + excelRow;
            writeFormula(dataRow, C_GRADE_AMOUNT,
                    "IF(" + gradeCell + "=\"A\"," + gradeARef + ",IF(" + gradeCell + "=\"B\"," + gradeBRef
                            + ",IF(" + gradeCell + "=\"C\"," + gradeCRef + ",0)))",
                    styles.money);
            writeFormula(dataRow, C_TOTAL_PAY,
                    "SUM(" + colRef(C_WATER_AMOUNT) + excelRow + "," + colRef(C_MIXED_AMOUNT) + excelRow + ","
                            + colRef(C_MEDICATION_AMOUNT) + excelRow + "," + colRef(C_ATTENDANCE_AMOUNT) + excelRow + ","
                            + colRef(C_STORM_AMOUNT) + excelRow + "," + colRef(C_SEASONAL_AMOUNT) + excelRow + ","
                            + colRef(C_GRADE_AMOUNT) + excelRow + ")",
                    styles.moneyBold);
            // Trừ/tạm ứng: KHÔNG override -> công thức tham chiếu mức mặc định (đổi mức mặc định ở
            // bảng đơn giá thì dòng này tự cập nhật); ĐÃ override -> số Admin đã CHỌN riêng cho nhân
            // viên này, không có công thức nào suy ra được giá trị đó.
            if (row.deductionIsOverride()) {
                writeCell(dataRow, C_DEDUCTION, row.deduction().doubleValue(), styles.money);
            } else {
                writeFormula(dataRow, C_DEDUCTION, defaultAdvanceRef, styles.money);
            }
            writeFormula(dataRow, C_NET_PAY, colRef(C_TOTAL_PAY) + excelRow + "-" + colRef(C_DEDUCTION) + excelRow, styles.moneyBold);
            writeCell(dataRow, C_STATUS, statusLabel(row.rowStatus()), styles.text);
            r++;
        }
        int lastDataRowExcel = r; // dòng nhân viên cuối (1-based)

        int totalRowIdx = r;
        Row totalRow = sheet.createRow(totalRowIdx);
        int totalRowExcel = totalRowIdx + 1;
        writeCell(totalRow, C_STT, "TỔNG CỘNG", styles.totalLabel);
        sheet.addMergedRegion(new CellRangeAddress(totalRowIdx, totalRowIdx, C_STT, C_NAME));
        for (int col : new int[] {C_WATER_KG, C_WATER_AMOUNT, C_MIXED_KG, C_MIXED_AMOUNT, C_MEDICATION_QTY,
                C_MEDICATION_AMOUNT, C_ATTENDANCE_QTY, C_ATTENDANCE_AMOUNT, C_STORM_QTY, C_STORM_AMOUNT,
                C_SEASONAL_QTY, C_SEASONAL_AMOUNT, C_GRADE_AMOUNT, C_TOTAL_PAY, C_DEDUCTION}) {
            boolean isQty = col == C_WATER_KG || col == C_MIXED_KG || col == C_MEDICATION_QTY
                    || col == C_ATTENDANCE_QTY || col == C_STORM_QTY || col == C_SEASONAL_QTY;
            writeFormula(totalRow, col,
                    "SUM(" + colRef(col) + firstDataRowExcel + ":" + colRef(col) + lastDataRowExcel + ")",
                    isQty ? styles.qtyBold : styles.moneyBold);
        }
        writeFormula(totalRow, C_NET_PAY, colRef(C_TOTAL_PAY) + totalRowExcel + "-" + colRef(C_DEDUCTION) + totalRowExcel, styles.moneyBold);

        sheet.createFreezePane(0, headerRowIdx + 1);
        applyColumnWidths(sheet);
        return new TeamSheetRef(totalRowExcel, rows.size());
    }

    private void writeOverviewSheet(Sheet sheet, Styles styles, Map<String, TeamSheetRef> refByTeam,
            Map<String, String> sheetNameByTeam, String monthLabel) {
        int r = 0;
        Row title = sheet.createRow(r++);
        writeCell(title, 0, "TỔNG HỢP BẢNG LƯƠNG " + monthLabel.toUpperCase(), styles.title);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 4));
        r++;

        Row header = sheet.createRow(r++);
        writeCell(header, 0, "Tổ", styles.tableHeader);
        writeCell(header, 1, "Số nhân viên", styles.tableHeader);
        writeCell(header, 2, "Tổng lương", styles.tableHeader);
        writeCell(header, 3, "Tổng trừ / tạm ứng", styles.tableHeader);
        writeCell(header, 4, "Tổng thực lãnh", styles.tableHeader);

        int firstTeamRowExcel = r + 1;
        for (Map.Entry<String, TeamSheetRef> entry : refByTeam.entrySet()) {
            String teamName = entry.getKey();
            TeamSheetRef ref = entry.getValue();
            String sheetName = sheetNameByTeam.get(teamName);
            Row row = sheet.createRow(r);
            writeCell(row, 0, teamName, styles.text);
            writeCell(row, 1, ref.employeeCount(), styles.text);
            writeFormula(row, 2, "'" + sheetName + "'!" + colRef(C_TOTAL_PAY) + ref.totalRowExcel(), styles.moneyBold);
            writeFormula(row, 3, "'" + sheetName + "'!" + colRef(C_DEDUCTION) + ref.totalRowExcel(), styles.money);
            writeFormula(row, 4, "'" + sheetName + "'!" + colRef(C_NET_PAY) + ref.totalRowExcel(), styles.moneyBold);
            r++;
        }
        int lastTeamRowExcel = r;

        Row grandTotal = sheet.createRow(r);
        writeCell(grandTotal, 0, "TỔNG CỘNG", styles.totalLabel);
        writeFormula(grandTotal, 1, "SUM(B" + firstTeamRowExcel + ":B" + lastTeamRowExcel + ")", styles.qtyBold);
        writeFormula(grandTotal, 2, "SUM(C" + firstTeamRowExcel + ":C" + lastTeamRowExcel + ")", styles.moneyBold);
        writeFormula(grandTotal, 3, "SUM(D" + firstTeamRowExcel + ":D" + lastTeamRowExcel + ")", styles.moneyBold);
        writeFormula(grandTotal, 4, "SUM(E" + firstTeamRowExcel + ":E" + lastTeamRowExcel + ")", styles.moneyBold);

        sheet.createFreezePane(0, 2);
        for (int i = 0; i < 5; i++) {
            sheet.setColumnWidth(i, 22 * 256);
        }
    }

    // ============================================================= helpers

    private int writeRateRow(Sheet sheet, Styles styles, int rowIdx, String label, BigDecimal value) {
        Row row = sheet.createRow(rowIdx);
        writeCell(row, 0, label, styles.text);
        writeCell(row, 1, value.doubleValue(), styles.moneyBold);
        return rowIdx;
    }

    private String statusLabel(PayrollRowStatus status) {
        return switch (status) {
            case CONFIRMED -> "Đã xác nhận";
            case NEEDS_REVIEW -> "Cần kiểm tra";
            case MISSING_DATA -> "Thiếu dữ liệu";
        };
    }

    /** "A16" — tham chiếu tương đối, dùng ghép công thức trong CÙNG dòng đang viết. */
    private String colRef(int col0based) {
        return CellReference.convertNumToColString(col0based);
    }

    /** "$B$4" — tham chiếu TUYỆT ĐỐI tới 1 ô cố định (bảng đơn giá đầu sheet), dùng lặp lại ở mọi
     * dòng nhân viên mà không lệch theo dòng. */
    private String absRef(int col0based, int row0based) {
        return "$" + colRef(col0based) + "$" + (row0based + 1);
    }

    private String uniqueSheetName(XSSFWorkbook workbook, String teamName) {
        String base = WorkbookUtil.createSafeSheetName(teamName);
        String candidate = base;
        int suffix = 2;
        while (workbook.getSheet(candidate) != null) {
            String tail = " (" + suffix + ")";
            int maxBaseLen = Math.max(1, 31 - tail.length());
            candidate = (base.length() > maxBaseLen ? base.substring(0, maxBaseLen) : base) + tail;
            suffix++;
        }
        return candidate;
    }

    private void applyColumnWidths(Sheet sheet) {
        sheet.setColumnWidth(C_STT, 6 * 256);
        sheet.setColumnWidth(C_NAME, 24 * 256);
        for (int col = C_WATER_KG; col <= C_SEASONAL_AMOUNT; col++) {
            sheet.setColumnWidth(col, 16 * 256);
        }
        sheet.setColumnWidth(C_GRADE, 12 * 256);
        sheet.setColumnWidth(C_GRADE_AMOUNT, 16 * 256);
        sheet.setColumnWidth(C_TOTAL_PAY, 16 * 256);
        sheet.setColumnWidth(C_DEDUCTION, 16 * 256);
        sheet.setColumnWidth(C_NET_PAY, 16 * 256);
        sheet.setColumnWidth(C_STATUS, 18 * 256);
    }

    private void writeCell(Row row, int col, Object value, CellStyle style) {
        Cell cell = row.createCell(col);
        if (value instanceof Double d) {
            cell.setCellValue(d);
        } else if (value instanceof Integer i) {
            cell.setCellValue(i);
        } else {
            cell.setCellValue(String.valueOf(value));
        }
        if (style != null) {
            cell.setCellStyle(style);
        }
    }

    private void writeFormula(Row row, int col, String formula, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellFormula(formula);
        if (style != null) {
            cell.setCellStyle(style);
        }
    }

    private byte[] toBytes(XSSFWorkbook workbook) throws IOException {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            workbook.write(out);
            return out.toByteArray();
        }
    }

    /** Style dùng chung — tạo 1 lần / workbook (POI khuyến cáo không tạo CellStyle trong vòng lặp
     * theo dòng, giới hạn ~64000 style riêng biệt / workbook). */
    private static final class Styles {
        final CellStyle title;
        final CellStyle sectionHeader;
        final XSSFCellStyle tableHeader;
        final CellStyle text;
        final CellStyle qty;
        final CellStyle qtyBold;
        final CellStyle money;
        final CellStyle moneyBold;
        final CellStyle totalLabel;

        Styles(XSSFWorkbook workbook) {
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            title = workbook.createCellStyle();
            title.setFont(titleFont);

            Font sectionFont = workbook.createFont();
            sectionFont.setBold(true);
            sectionFont.setItalic(true);
            sectionHeader = workbook.createCellStyle();
            sectionHeader.setFont(sectionFont);

            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            tableHeader = workbook.createCellStyle();
            tableHeader.setFont(headerFont);
            tableHeader.setFillForegroundColor(brandGreen(workbook));
            tableHeader.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            tableHeader.setAlignment(HorizontalAlignment.CENTER);
            tableHeader.setWrapText(true);
            applyThinBorder(tableHeader);

            text = workbook.createCellStyle();
            applyThinBorder(text);

            DataFormatHolder fmt = new DataFormatHolder(workbook);

            qty = workbook.createCellStyle();
            qty.setDataFormat(fmt.qty);
            applyThinBorder(qty);

            Font boldFont = workbook.createFont();
            boldFont.setBold(true);
            qtyBold = workbook.createCellStyle();
            qtyBold.setDataFormat(fmt.qty);
            qtyBold.setFont(boldFont);
            applyThinBorder(qtyBold);
            qtyBold.setBorderTop(BorderStyle.MEDIUM);

            money = workbook.createCellStyle();
            money.setDataFormat(fmt.money);
            applyThinBorder(money);

            moneyBold = workbook.createCellStyle();
            moneyBold.setDataFormat(fmt.money);
            moneyBold.setFont(boldFont);
            applyThinBorder(moneyBold);
            moneyBold.setBorderTop(BorderStyle.MEDIUM);

            totalLabel = workbook.createCellStyle();
            totalLabel.setFont(boldFont);
            applyThinBorder(totalLabel);
            totalLabel.setBorderTop(BorderStyle.MEDIUM);
        }

        private static void applyThinBorder(CellStyle style) {
            style.setBorderTop(BorderStyle.THIN);
            style.setBorderBottom(BorderStyle.THIN);
            style.setBorderLeft(BorderStyle.THIN);
            style.setBorderRight(BorderStyle.THIN);
        }

        // Deep Forest Green (theme/colors.ts green[700] #166B42) — cùng tông thương hiệu web app,
        // không bịa màu mới.
        private static XSSFColor brandGreen(XSSFWorkbook workbook) {
            return new XSSFColor(new byte[] {(byte) 0x16, (byte) 0x6B, (byte) 0x42}, null);
        }

        private record DataFormatHolder(short qty, short money) {
            DataFormatHolder(XSSFWorkbook workbook) {
                this(workbook.createDataFormat().getFormat("#,##0.00"),
                        workbook.createDataFormat().getFormat("#,##0"));
            }
        }
    }
}
