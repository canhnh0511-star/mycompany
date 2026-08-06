package com.mycompany.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Xem docs/adr/0004-auth-simplified-for-v1.md — chỉ access token, hết hạn 1 ngày, không refresh token.
 */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(String secret, long expirationMs) {
}
