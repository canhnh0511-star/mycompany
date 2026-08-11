# Deploy backend lên Railway (Dockerfile builder)

Cần chọn nơi host `services/api` cho v1 (điểm để ngỏ từ CLAUDE.md §7 / `docs/TASKS.md` Phase 5).

**Quyết định: Railway**, build bằng Dockerfile (không dùng Nixpacks auto-detect) — cấu hình ở
`railway.json` (gốc repo) trỏ `build.dockerfilePath = Dockerfile`.

**Lý do:**
1. BE là JVM process chạy liên tục (không phải FaaS) — cần platform không "ngủ" khi rảnh. Tier trả phí
   thấp nhất của Railway không sleep; free tier của Render thì có, gây cold start ngay lúc Admin cần OCR
   ngoài thực địa (rủi ro mạng đã note ở CLAUDE.md §9) — loại Render free.
2. Dự án 1 người, 6 tuần — ưu tiên zero-ops: không cần tự quản OS/TLS/reverse proxy/systemd như VPS.
3. Dùng **Dockerfile thay vì Nixpacks** (buildpack tự nhận diện của Railway) vì repo là **monorepo**:
   runtime image cần copy cả `db/migrations` (nằm ngoài `services/api`) để giữ đúng convention
   `spring.flyway.locations: filesystem:../../db/migrations` trong `application.yml` — Nixpacks tự
   nhận diện Gradle sẽ không biết cách làm việc này, và tự viết Dockerfile cũng portable hơn nếu sau
   này đổi sang Fly.io/VPS.
4. `/actuator/health` đã có sẵn (permitAll) — cắm thẳng vào `healthcheckPath` trong `railway.json`,
   không cần thêm code.
5. DB (Postgres) + ảnh phiếu đã ở Supabase (không host trên Railway) — BE trên Railway chỉ cần
   outbound HTTPS tới Supabase + Anthropic API, không cần volume/disk riêng.

**Không chọn:**
- **Render free** — sleep sau 15 phút không traffic.
- **Fly.io** — tương đương Railway về việc không sleep, nhưng thêm việc tự viết `fly.toml` + quản lý
  region/volume mà không có lợi ích rõ ràng hơn cho quy mô hiện tại; cân nhắc lại nếu cần scale/region
  gần Supabase hơn.
- **VPS** — rẻ hơn nhưng cộng thêm ops (patching, TLS, restart khi crash) không đáng với timeline 6 tuần.

**Cấu hình liên quan:** `Dockerfile` + `.dockerignore` (gốc repo, build context = gốc repo vì cần copy
`db/migrations`), `railway.json` (gốc repo). Biến môi trường set trực tiếp trên Railway dashboard theo
đúng danh sách ở `services/api/.env.example`, cộng `SPRING_PROFILES_ACTIVE=prod` (tắt Swagger UI ở prod
— chốt luôn Open Question còn treo ở `docs/TASKS.md` Phase 5) và `CORS_ALLOWED_ORIGINS` trỏ đúng domain
frontend khi deploy web thật.

Cần xem lại nếu chi phí Railway vượt ngân sách hoặc cần scale ra ngoài khả năng 1 service/1 region.
