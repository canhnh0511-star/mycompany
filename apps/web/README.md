# Web — Nông trường cao su

Website quản lý (React + TypeScript + Vite + MUI + TanStack Query), theo đặc tả
`docs/specs/spec-3-web-ui-home.md`. Đã triển khai **Tổng quan (Home)** và
**Bảng lương** (`docs/specs/spec-3-bang-luong-v1-draft.md`) — các route khác
hiển thị placeholder "Đang phát triển" (xem spec §44/§47).

## Chạy dev

```bash
npm install
cp .env.example .env.local   # chỉnh VITE_API_BASE_URL nếu backend không chạy ở :8080
npm run dev
```

Khi chạy `npm run dev`, panel Home (KPI/work-queue/team-status/payroll-summary
tóm tắt/recent-documents) dùng **fixture dev** vì backend `/api/v1/dashboard/*`
chưa tồn tại — xem `src/features/dashboard/api/dashboard.api.ts`. Nhánh fixture
bị Vite loại bỏ hoàn toàn khỏi bundle production (`import.meta.env.DEV` là
literal `false` khi build).

**Bảng lương KHÔNG dùng fixture** — `services/api` đã có `PayrollController`
đầy đủ (`/api/v1/payroll`), `src/features/payroll/` gọi thẳng API thật kể cả
lúc `npm run dev`. Cần backend chạy thật + có dữ liệu (xem
`docs/module-3-payroll-local-verification.md`) mới thấy được bảng có dữ liệu.

## Backend còn thiếu

`services/api` (Spring Boot) **chưa có** các endpoint dashboard mà web này gọi
khi build production:

- `GET /api/v1/dashboard/kpis?date=`
- `GET /api/v1/dashboard/work-queue?date=`
- `GET /api/v1/dashboard/teams?date=`
- `GET /api/v1/dashboard/payroll-summary?month=` (panel tóm tắt trên Home — KHÁC
  `/api/v1/payroll` của màn Bảng lương đầy đủ, đã có sẵn)
- `GET /api/v1/dashboard/recent-documents?date=&limit=`

Tới khi backend triển khai các endpoint này, bản build production sẽ hiển thị
đúng trạng thái lỗi/"Thử lại" ở từng widget Home (theo spec §33) — đây là hành
vi đúng, không phải bug. Kiểu dữ liệu kỳ vọng: xem
`src/features/dashboard/model/dashboard.types.ts`.

`GET /api/v1/users/me`, `GET /api/v1/teams`, và toàn bộ `/api/v1/payroll/*` đã
có sẵn ở backend và được dùng thật (không mock).

## Gotcha khi test local với backend thật

`services/api`'s CORS mặc định (`app.cors.allowed-origins`,
`services/api/src/main/resources/application.yml`) chỉ cho phép
`http://localhost:8081` và `http://localhost:19006` (cổng dev của Expo web) —
**KHÔNG có `http://localhost:5173`** (cổng mặc định của Vite dev server cho
web này). Chạy `npm run dev` ở đây rồi gọi backend thật sẽ bị CORS chặn nếu
chưa thêm origin — đặt biến môi trường khi chạy backend:

```bash
CORS_ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006,http://localhost:5173 ./gradlew bootRun
```

## Scripts

```bash
npm run dev       # dev server
npm run build     # typecheck (tsc -b) + build production
npm run lint      # oxlint
npm run preview   # xem thử bản build
```
