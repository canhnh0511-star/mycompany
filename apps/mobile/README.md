# apps/mobile

Frontend Module 1 (Expo + Expo Router, TypeScript) — xem `CLAUDE.md` (gốc repo) và
`docs/frontend-grilling-plan.md` + `docs/adr/0009`–`0018` cho toàn bộ quyết định kiến trúc trước khi
sửa/thêm gì ở đây.

## Chạy dev

```bash
cd apps/mobile
npm install
cp .env.example .env.local   # sửa EXPO_PUBLIC_API_BASE_URL nếu backend không chạy ở localhost:8080
npm run web      # hoặc: npm run ios / npm run android (cần Expo Go hoặc EAS dev build — ADR-0018)
```

Backend (`services/api`) phải chạy trước (`./gradlew bootRun`) — app không có mock data, mọi màn hình
gọi thẳng API thật qua `src/lib/api/client.ts`.

## Trạng thái hiện tại (scaffold)

- Expo Router + gluestack-ui (v5 alpha, NativeWind v5/Tailwind v4) đã cài — ADR-0015.
- Nền tảng đã nối: `apiClient` (ADR-0009, xử lý 401 tập trung), `tokenStorage` (ADR-0010, SecureStore
  native / localStorage web), TanStack Query (`queryClient` + `queryKeys`), auth store (Zustand) +
  `useAuth()` (ADR-0016).
- Route đã dựng đúng cấu trúc (`docs/frontend-grilling-plan.md` §3): `(auth)/login` (build thật, gọi API
  thật), `(tabs)` 4 tab (`capture`/`quick-entry`/`lookup` — placeholder chờ wireframe; `profile` — build
  thật, gọi `GET /users/me`), `(web)` — placeholder cho danh mục + báo cáo.
- Component dùng chung: `src/components/App*.tsx` (wrap `src/components/ui/*` do CLI gluestack sinh ra —
  xem `src/components/README.md` cho quy ước, KHÔNG import `ui/*` trực tiếp từ feature code).
- Các `features/*/` khác `auth` mới chỉ có `README.md` — chờ wireframe (claude.ai/design) chốt layout
  trước khi build logic thật (`docs/frontend-grilling-plan.md` §5).

## Quy ước

Xem `CLAUDE.md` §6 (feature folder, TypeScript, Context/Zustand) và các ADR liên quan trong
`docs/adr/0009`–`0018` trước khi thêm feature mới — đừng đoán lại quyết định đã chốt.
