# features/admin-catalog

CRUD Teams/Employees/LatexTypes/RateConfigs/AllowanceConfigs — dùng chung 1 layout dạng bảng
(ưu tiên web/tablet, CLAUDE.md §5).

- [x] **Teams** (`teams/`) — xong. Đơn giản nhất (chỉ `name`/`description`, không DELETE — CLAUDE.md §4),
  dùng làm mẫu pattern cho các resource còn lại: list + form inline (không Modal — gluestack-ui bản
  alpha đang dùng chưa có Modal ổn định, xem `docs/frontend-grilling-plan.md` §5), react-query
  (`useTeamsQuery`/`useCreateTeamMutation`/`useUpdateTeamMutation`), invalidate theo `queryKeys.teams.all`.
- [ ] Employees, LatexTypes, RateConfigs, AllowanceConfigs — chưa build, lặp lại pattern của `teams/`
  (thêm phần riêng: Employees có `team_id`/`status` select, LatexTypes có `code` không sửa được sau khi
  tạo, RateConfigs/AllowanceConfigs có `effective_from`/`effective_to` + validate chồng lấn hiển thị lỗi
  409 từ backend).
