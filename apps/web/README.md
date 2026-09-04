# Web — Nông trường cao su

Website quản lý (React + TypeScript + Vite + MUI + TanStack Query), theo đặc tả
`docs/specs/spec-3-web-ui-home.md`. Chỉ màn **Tổng quan (Home)** được triển
khai — các route khác hiển thị placeholder "Đang phát triển" (xem spec §44/§47).

## Chạy dev

```bash
npm install
cp .env.example .env.local   # chỉnh VITE_API_BASE_URL nếu backend không chạy ở :8080
npm run dev
```

Khi chạy `npm run dev`, các panel Home dùng **fixture dev** (số liệu khớp
`docs/design/home-dashboard-reference.png`) thay vì gọi API thật — xem
`src/features/dashboard/api/dashboard.api.ts`. Nhánh fixture bị Vite loại bỏ
hoàn toàn khỏi bundle production (`import.meta.env.DEV` là literal `false` khi
build), nên `npm run build` không chứa dữ liệu mock nào.

## Backend còn thiếu

`services/api` (Spring Boot) **chưa có** các endpoint dashboard mà web này gọi
khi build production:

- `GET /api/v1/dashboard/kpis?date=`
- `GET /api/v1/dashboard/work-queue?date=`
- `GET /api/v1/dashboard/teams?date=`
- `GET /api/v1/dashboard/payroll-summary?month=`
- `GET /api/v1/dashboard/recent-documents?date=&limit=`

Tới khi backend triển khai các endpoint này, bản build production sẽ hiển thị
đúng trạng thái lỗi/"Thử lại" ở từng widget (theo spec §33) — đây là hành vi
đúng, không phải bug. Kiểu dữ liệu kỳ vọng: xem
`src/features/dashboard/model/dashboard.types.ts`.

`GET /api/v1/users/me` đã có sẵn ở backend và được dùng thật (không mock) cho
tên/vai trò hiển thị ở sidebar footer + top bar.

## Scripts

```bash
npm run dev       # dev server
npm run build     # typecheck (tsc -b) + build production
npm run lint      # oxlint
npm run preview   # xem thử bản build
```
