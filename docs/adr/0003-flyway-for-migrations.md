# Dùng Flyway cho database migration

`db/migrations/001_init_schema.sql` được viết bằng SQL thuần, và comment ban đầu để ngỏ giữa Flyway/Liquibase. **Quyết định: dùng Flyway.**

Lý do: Flyway chạy trực tiếp file `.sql` không cần lớp trừu tượng riêng (XML/YAML của Liquibase) — với dự án 1 người, đã quen viết SQL trực tiếp, và chỉ dùng một mình Postgres (không cần khả năng multi-DB của Liquibase), Flyway là lựa chọn ít ma sát nhất để học và duy trì.
