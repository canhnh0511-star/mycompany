package com.mycompany.api.exception;

/**
 * Lỗi nghiệp vụ ở tầng request mà bean validation (jakarta.validation) không diễn tả được — vd
 * effective_to đứng trước effective_from. Map sang HTTP 400 ở GlobalExceptionHandler.
 */
public class InvalidRequestException extends RuntimeException {

    public InvalidRequestException(String message) {
        super(message);
    }
}
