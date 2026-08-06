package com.mycompany.api.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.util.NoSuchElementException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Trả lỗi dạng ProblemDetail (RFC 7807, mặc định của Spring Boot 3). Mọi exception không được bắt
 * riêng đều rơi vào handler cuối (500) — LUÔN log kèm stack trace đầy đủ; requestId đã có sẵn trong
 * MDC (RequestIdFilter) nên tự động xuất hiện trong dòng log JSON, không cần log thủ công lại ở đây.
 * Xem CLAUDE.md §7.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Dữ liệu không hợp lệ");
        problem.setDetail(ex.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .reduce((a, b) -> a + "; " + b)
                .orElse("Validation failed"));
        return problem;
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ProblemDetail handleBadCredentials(BadCredentialsException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.UNAUTHORIZED);
        problem.setTitle("Đăng nhập thất bại");
        problem.setDetail(ex.getMessage());
        return problem;
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ProblemDetail handleNotFound(NoSuchElementException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
        problem.setTitle("Không tìm thấy dữ liệu");
        problem.setDetail(ex.getMessage());
        return problem;
    }

    @ExceptionHandler(InvalidRequestException.class)
    public ProblemDetail handleInvalidRequest(InvalidRequestException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Dữ liệu không hợp lệ");
        problem.setDetail(ex.getMessage());
        return problem;
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail handleUnreadableBody(HttpMessageNotReadableException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Dữ liệu không hợp lệ");
        problem.setDetail("Không đọc được request body — kiểm tra định dạng JSON và giá trị enum (viết hoa, vd \"PER_DAY\")");
        return problem;
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ProblemDetail handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Tham số không hợp lệ");
        problem.setDetail("Giá trị không hợp lệ cho tham số '" + ex.getName() + "': " + ex.getValue());
        return problem;
    }

    @ExceptionHandler(ConflictException.class)
    public ProblemDetail handleConflict(ConflictException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.CONFLICT);
        problem.setTitle("Xung đột dữ liệu");
        problem.setDetail(ex.getMessage());
        return problem;
    }

    // Lưới an toàn ở tầng DB — service layer đã tự validate chồng lấn effective_from/to trước khi insert
    // (xem RateConfigService/AllowanceConfigService), nhưng race condition giữa 2 request đồng thời vẫn
    // có thể lọt qua và chỉ bị EXCLUDE constraint chặn ở DB. Bắt ở đây để không lộ lỗi SQL thô ra ngoài.
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail handleDataIntegrityViolation(DataIntegrityViolationException ex, HttpServletRequest request) {
        log.warn("Vi phạm ràng buộc dữ liệu ở {} {}: {}", request.getMethod(), request.getRequestURI(), ex.getMessage());
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.CONFLICT);
        problem.setTitle("Xung đột dữ liệu");
        problem.setDetail("Dữ liệu vi phạm ràng buộc (trùng lặp hoặc chồng lấn khoảng thời gian hiệu lực).");
        return problem;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Lỗi không xử lý được ở {} {}", request.getMethod(), request.getRequestURI(), ex);
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        problem.setTitle("Đã có lỗi xảy ra");
        problem.setDetail("Vui lòng thử lại. Nếu lỗi tiếp diễn, liên hệ hỗ trợ kèm request id trong header X-Request-Id.");
        return problem;
    }
}
