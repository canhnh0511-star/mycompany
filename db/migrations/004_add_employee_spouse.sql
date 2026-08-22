-- =====================================================================
-- Bổ sung 2026-08-16: phiếu giấy "sổ ghi mủ" đôi khi chỉ ghi 1 dòng cho 1 người, nhưng thực ra sản
-- lượng đó là CHUNG của 2 vợ chồng (2 employee riêng biệt) và cần hiểu là chia đôi. Admin khai báo
-- TRƯỚC quan hệ vợ/chồng ở đây (không suy luận lại mỗi lần OCR) — khi OCR fuzzy-match ra 1 employee
-- đã có spouse_employee_id, OcrCaptureService tự tạo 2 draft record chia đôi kg thay vì 1
-- (CLAUDE.md §5, xem thêm EmployeeService.updateSpouse).
--
-- Tự tham chiếu (self-referencing FK) thay vì bảng join riêng — quan hệ 1-1 đơn giản, đối xứng, được
-- giữ đồng bộ 2 chiều ở tầng service (EmployeeService) trong 1 transaction; không cần chuẩn hóa thành
-- bảng riêng như latex_types/rate_configs (ADR-0002) vì đây không phải danh mục mở nhiều-nhiều.
-- =====================================================================

ALTER TABLE employees
    ADD COLUMN spouse_employee_id UUID REFERENCES employees(id);

ALTER TABLE employees
    ADD CONSTRAINT chk_employees_spouse_not_self CHECK (spouse_employee_id IS DISTINCT FROM id);

CREATE INDEX idx_employees_spouse_employee_id ON employees(spouse_employee_id);
