# Build image cho services/api (Spring Boot + Gradle) — dùng cho Railway (railway.json ở gốc repo
# trỏ builder=DOCKERFILE vào file này) và tương thích Fly.io/bất kỳ platform nào chạy Docker.
# Build context PHẢI là gốc repo (không phải services/api) vì stage runtime cần copy cả db/migrations
# nằm ngoài services/api — xem docs/adr/0020-deployment-platform-railway.md.

# ---- Stage 1: build JAR bằng Gradle wrapper ----
FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /build

# Copy trước phần ít đổi nhất (wrapper + build script) để tận dụng Docker layer cache khi chỉ sửa src/
COPY services/api/gradlew services/api/gradlew.bat ./
COPY services/api/gradle ./gradle
COPY services/api/build.gradle.kts services/api/settings.gradle.kts ./
RUN chmod +x gradlew

COPY services/api/src ./src
# -x test: test chạy ở CI riêng (integration test cần Supabase thật, không hợp để chạy trong lúc build
# image — xem docs/TASKS.md Phase 5 "KHÔNG Docker/Testcontainers")
RUN ./gradlew bootJar --no-daemon -x test

# ---- Stage 2: runtime, chỉ JRE + JAR đã build ----
FROM eclipse-temurin:21-jre-jammy

# Giữ đúng layout thư mục services/api/ để application.yml's
# `spring.flyway.locations: filesystem:../../db/migrations` (giả định chạy từ working directory
# services/api, xem application.yml) tiếp tục đúng mà KHÔNG cần override bằng env var:
#   /app/db/migrations       <- ../../db/migrations nhìn từ /app/services/api
#   /app/services/api/app.jar
WORKDIR /app/services/api
COPY --from=build /build/build/libs/*.jar app.jar
COPY db/migrations /app/db/migrations

# Không hardcode PORT — Railway tự inject biến PORT, application.yml đã đọc ${PORT:8080} sẵn.
EXPOSE 8080

# Base image eclipse-temurin không có sẵn non-root user — tự tạo thay vì chạy bằng root.
RUN groupadd --system spring && useradd --system --gid spring spring
USER spring

ENTRYPOINT ["java", "-jar", "app.jar"]
