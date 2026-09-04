# Build image cho apps/web (Vite + React, static SPA) — dùng cho Railway.
# Khác với Dockerfile ở gốc repo (dành cho services/api): service này trên Railway có
# Root Directory = apps/web, nên build context = apps/web (không phải gốc repo) — xem
# docs/adr/0023-deploy-web-railway.md.

# ---- Stage 1: build static assets bằng Vite ----
FROM node:20-alpine AS build
WORKDIR /build

# Copy trước phần ít đổi nhất (lockfile) để tận dụng Docker layer cache khi chỉ sửa src/
COPY package.json package-lock.json ./
RUN npm ci

# VITE_API_BASE_URL bị bake thẳng vào bundle lúc build (biến Vite luôn là build-time, KHÔNG đọc
# được lúc runtime — xem src/api/client.ts) — Railway tự truyền service variable cùng tên vào build
# arg vì Dockerfile khai báo ARG ở đây; set biến này trên Railway = URL public của services/api.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY . .
RUN npm run build

# ---- Stage 2: serve static files bằng nginx ----
FROM nginx:1.27-alpine

COPY --from=build /build/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Railway tự inject biến PORT — image nginx chính thức tự envsubst mọi file *.template trong
# /etc/nginx/templates/ ra /etc/nginx/conf.d/ lúc container khởi động, thay ${PORT} bằng giá trị
# thật (chỉ thay các biến TỒN TẠI trong env, không đụng tới biến nginx nội bộ như $uri).
ENV PORT=8080
EXPOSE 8080
