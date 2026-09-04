package com.mycompany.api.service;

import com.mycompany.api.config.SupabaseStorageProperties;
import com.mycompany.api.exception.InvalidRequestException;
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Supabase Storage (bucket private "receipt-photos") — backend giữ service role key, KHÔNG proxy
 * binary ảnh qua Spring Boot (docs/TASKS.md Phase 3): tạo signed upload URL để app upload trực
 * tiếp, và tự tải lại ảnh bằng service role key khi cần gửi cho Claude Vision.
 *
 * <p>Gọi thẳng REST API của Supabase Storage bằng RestClient (không kéo thêm supabase-java SDK —
 * cùng tinh thần "giữ dependency tối thiểu" như ClaudeOcrService). Endpoint xác nhận qua
 * storage-js: {@code POST {url}/storage/v1/object/upload/sign/{bucket}/{path}} trả về
 * {@code {url: "/object/upload/sign/{bucket}/{path}?token=..."}}; client PUT vào đúng URL đó kèm
 * token để upload. Backend đọc ngược bằng {@code GET {url}/storage/v1/object/{bucket}/{path}}
 * (không cần token — đã có service role key).
 *
 * <p>Constructor tường minh (không Lombok @RequiredArgsConstructor) — cần derive {@code restClient}
 * từ {@code properties.url()} ngay lúc khởi tạo; field initializer của Lombok-generated
 * constructor chạy TRƯỚC khi field injected được gán (xem JwtService làm mẫu tương tự).
 */
@Service
@Slf4j
public class SupabaseStorageService {

    private final SupabaseStorageProperties properties;
    private final RestClient restClient;

    public SupabaseStorageService(SupabaseStorageProperties properties) {
        this.properties = properties;
        // Cùng lý do đã ghi ở ClaudeOcrService — RestClient.builder() mặc định không có timeout,
        // request thread có thể treo vô thời hạn nếu Supabase Storage chậm/hang.
        var requestFactory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build());
        requestFactory.setReadTimeout(Duration.ofSeconds(60));
        this.restClient = RestClient.builder().baseUrl(properties.url() + "/storage/v1")
                .requestFactory(requestFactory).build();
    }

    public record SignedUploadUrl(String objectPath, String uploadUrl, String token) {
    }

    public SignedUploadUrl createSignedUploadUrl(String contentType) {
        if (!properties.allowedContentTypes().contains(contentType)) {
            throw new InvalidRequestException("Định dạng ảnh không được hỗ trợ: " + contentType
                    + " — chỉ chấp nhận " + properties.allowedContentTypes());
        }
        // KHÔNG dùng fileName do client gửi lên để đặt object path — tự sinh path an toàn (chống
        // path traversal qua fileName không được sanitize). UUID đủ để tránh trùng.
        String objectPath = "ocr/" + LocalDate.now() + "/" + UUID.randomUUID() + extensionFor(contentType);

        // Dùng .uri(String) trực tiếp (không phải uri-template với {path}) — objectPath chứa "/",
        // nếu để Spring encode qua template variable sẽ escape thành %2F và sai path thực tế trên
        // Supabase Storage.
        @SuppressWarnings("unchecked")
        Map<String, Object> response = restClient.post()
                .uri("/object/upload/sign/" + properties.bucket() + "/" + objectPath)
                .header("Authorization", "Bearer " + properties.serviceRoleKey())
                .header("apikey", properties.serviceRoleKey())
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of())
                .retrieve()
                .body(Map.class);

        String relativeUrl = String.valueOf(response.get("url")); // "/object/upload/sign/bucket/path?token=..."
        String token = extractToken(relativeUrl);
        String uploadUrl = properties.url() + "/storage/v1" + relativeUrl;
        return new SignedUploadUrl(objectPath, uploadUrl, token);
    }

    /**
     * URL có chữ ký để ĐỌC 1 ảnh (khác {@link #createSignedUploadUrl}, dùng để GHI) — bucket
     * "receipt-photos" là private nên FE không thể tải thẳng bằng object path lưu ở DB
     * (`photo_url` cột lưu path tương đối, không phải URL công khai). Gọi mỗi lần build response
     * có kèm ảnh (`ProductionRecordService`/`LatexSaleService`.toResponse()) — không cache URL đã ký
     * lại DB vì hết hạn sau {@code expiresInSeconds}, cache sẽ trả URL chết.
     *
     * <p>Endpoint xác nhận qua storage-js: {@code POST {url}/storage/v1/object/sign/{bucket}/{path}}
     * body {@code {expiresIn: <giây>}}, trả {@code {signedURL: "/object/sign/bucket/path?token=..."}}
     * (khác field {@code url} ở {@link #createSignedUploadUrl}).
     */
    public String createSignedReadUrl(String objectPath, int expiresInSeconds) {
        if (objectPath == null || objectPath.isBlank()) {
            return null;
        }
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri("/object/sign/" + properties.bucket() + "/" + objectPath)
                    .header("Authorization", "Bearer " + properties.serviceRoleKey())
                    .header("apikey", properties.serviceRoleKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("expiresIn", expiresInSeconds))
                    .retrieve()
                    .body(Map.class);
            String relativeUrl = String.valueOf(response.get("signedURL"));
            return properties.url() + "/storage/v1" + relativeUrl;
        } catch (RestClientException ex) {
            // Không chặn cả response chỉ vì 1 ảnh cũ/đã xóa khỏi Storage không ký được nữa — log WARN
            // (CLAUDE.md §7, tự phục hồi được: user vẫn xem được số liệu, chỉ thiếu ảnh) và trả null
            // thay vì ném lỗi, để `toResponse()` gọi chỗ này không phải tự try/catch lại.
            log.warn("Không ký được URL đọc ảnh (objectPath={}): {}", objectPath, ex.getMessage());
            return null;
        }
    }

    public byte[] download(String objectPath) {
        try {
            return restClient.get()
                    .uri("/object/" + properties.bucket() + "/" + objectPath)
                    .header("Authorization", "Bearer " + properties.serviceRoleKey())
                    .header("apikey", properties.serviceRoleKey())
                    .retrieve()
                    .body(byte[].class);
        } catch (RestClientException ex) {
            // Supabase Storage trả 400 (không phải 404) khi object không tồn tại — bắt chung
            // RestClientException để không lộ 500 chung chung cho 1 lỗi hoàn toàn có thể đoán
            // trước (photoPath sai/ảnh chưa upload xong/token hết hạn).
            log.warn("Không tải được ảnh từ Supabase Storage (objectPath={}): {}", objectPath, ex.getMessage());
            throw new InvalidRequestException(
                    "Không tải được ảnh tại photoPath=" + objectPath + " từ Supabase Storage — kiểm tra lại đã upload xong chưa");
        }
    }

    private String extractToken(String relativeUrl) {
        int idx = relativeUrl.indexOf("token=");
        if (idx < 0) {
            throw new IllegalStateException("Supabase Storage không trả token trong signed upload URL: " + relativeUrl);
        }
        return relativeUrl.substring(idx + "token=".length());
    }

    private String extensionFor(String contentType) {
        return switch (contentType) {
            case "image/png" -> ".png";
            default -> ".jpg"; // image/jpeg — validate() ở trên đã chặn content-type khác
        };
    }
}
