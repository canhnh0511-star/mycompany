package com.mycompany.api.config;

import com.mycompany.api.entity.User;
import com.mycompany.api.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Đọc header Authorization: Bearer <token>, xác thực JWT, nạp User tương ứng vào SecurityContext.
 * Token thiếu/không hợp lệ/hết hạn → để request đi tiếp ở trạng thái anonymous; endpoint được bảo vệ
 * (mặc định mọi endpoint trừ /auth/login — xem SecurityConfig) sẽ tự trả 401.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                Claims claims = jwtService.parseClaims(token);
                UUID userId = UUID.fromString(claims.getSubject());
                Optional<User> user = userRepository.findById(userId).filter(User::isActive);
                user.ifPresent(u -> {
                    var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + u.getRole().name()));
                    var authentication = new UsernamePasswordAuthenticationToken(u, null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                });
            } catch (JwtException | IllegalArgumentException e) {
                log.warn("JWT không hợp lệ: {}", e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }
}
