# Deploy apps/web lên Railway (service riêng, cùng project với services/api)

Module 1 release 1 mới có màn Home/Tổng quan (xem `docs/specs/spec-3-web-ui-home.md`), nhưng cần
deploy sớm để có link xem thật thay vì chỉ chạy `npm run dev` local — bước tiếp theo sau khi đã
khớp UI với ảnh reference.

**Quyết định: deploy `apps/web` như 1 Railway service RIÊNG**, cùng Railway project với
`services/api` (đã deploy theo `docs/adr/0020-deployment-platform-railway.md`) — không gộp chung 1
service, không host trên platform khác.

**Lý do:**

1. **Cùng project, khác service** — Railway hỗ trợ nhiều service trong 1 project, mỗi service tự
   chọn **Root Directory** riêng trỏ vào 1 thư mục của monorepo (ở đây là `apps/web`) và tự đọc
   `railway.json`/`Dockerfile` ngay trong thư mục đó. Không cần tách repo, không cần platform thứ 2 —
   giữ đúng tinh thần "zero-ops" đã chốt ở ADR-0020.
2. **Build bằng Dockerfile riêng cho `apps/web`** (`apps/web/Dockerfile`, build context =
   `apps/web`, khác hẳn `Dockerfile` ở gốc repo dành cho BE) — 2 stage:
   - Stage 1 (`node:20-alpine`): `npm ci` + `npm run build` ra static assets (`dist/`).
   - Stage 2 (`nginx:1.27-alpine`): serve `dist/` bằng nginx, có `try_files ... /index.html` cho
     client-side routing (React Router) — thiếu dòng này thì reload ở route con (vd `/phieu`) ra 404
     từ nginx thay vì render app.
3. **`VITE_API_BASE_URL` là biến build-time, không phải runtime** — Vite bake thẳng giá trị vào
   bundle lúc `npm run build` (xem `src/api/client.ts`), khác hẳn biến môi trường Spring Boot đọc lúc
   chạy. Dockerfile khai báo `ARG VITE_API_BASE_URL` để Railway tự truyền service variable cùng tên
   vào build — set biến này trên Railway = URL public của service `services/api` (KHÔNG phải
   `localhost:8080` như `.env.example` mặc định cho dev).
4. **Cổng lắng nghe theo `$PORT`** — Railway tự inject biến `PORT`, container phải lắng nghe đúng
   cổng đó. nginx không tự đọc biến môi trường trong `nginx.conf`, nên dùng
   `/etc/nginx/templates/default.conf.template` (tính năng có sẵn của image `nginx` chính thức: tự
   `envsubst` mọi file `*.template` ra `/etc/nginx/conf.d/` lúc container start) — `listen ${PORT};`
   được thay bằng giá trị thật, không cần entrypoint script tự viết.
5. **Không dùng Nixpacks tự nhận diện** — lý do giống hệt ADR-0020 (mục 3): Nixpacks không biết tự
   dựng nginx + SPA fallback đúng cách; viết Dockerfile tường minh cũng portable hơn nếu sau này đổi
   platform.
6. **`healthcheckPath: "/"`** trong `apps/web/railway.json` — nginx trả `index.html` (200) ngay tại
   root, không cần thêm endpoint riêng như `/actuator/health` bên BE.

**Không chọn:**

- **Gộp `apps/web` build vào chung `Dockerfile`/service với `services/api`** — 2 process khác hẳn
  nhau (JVM app vs static file server), gộp chung sẽ phải tự dựng reverse-proxy trong 1 container,
  phức tạp hơn hẳn 2 service riêng mà Railway đã hỗ trợ sẵn.
- **Vercel/Netlify cho riêng phần web** — vận hành tốt cho SPA nhưng phát sinh thêm 1 platform/tài
  khoản phải quản lý, CORS phải cấu hình xuyên platform; giữ 1 platform duy nhất (Railway) cho cả
  BE lẫn FE đơn giản hơn ở quy mô dự án 1 người.
- **`vite preview` làm production server** — nhanh gọn (không cần nginx) nhưng chính tài liệu Vite
  khuyến cáo không dùng cho production (thiếu cache header, nén, hardening); nginx không tốn thêm
  công sức đáng kể mà đúng chuẩn hơn.

**Cấu hình liên quan:** `apps/web/Dockerfile`, `apps/web/nginx.conf.template`,
`apps/web/.dockerignore`, `apps/web/railway.json`. Biến môi trường set trên Railway dashboard (service
`apps/web`, tab Variables): `VITE_API_BASE_URL` = URL public của service BE trên Railway. Phía BE cần
thêm `CORS_ALLOWED_ORIGINS` trỏ đúng domain Railway của `apps/web` một khi đã có domain thật (đã note
sẵn ở ADR-0020, chưa set vì chưa có domain).

**Đã deploy thành công (2026-09-04)** — domain thật:
`https://mycompany-production-e7a7.up.railway.app` (Root Directory `apps/web`, verify bằng cách mở
trực tiếp trên trình duyệt — sandbox chạy Claude Code chặn hẳn domain `*.up.railway.app` ở tầng proxy
egress nên không tự `curl` verify được từ phiên làm việc).

**Cần xem lại** nếu sau này `apps/web` có thêm màn hình cần SSR/SEO (hiện là SPA thuần, admin tool nội
bộ — không cần).
