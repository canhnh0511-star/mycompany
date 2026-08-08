// Ambient declaration cho side-effect import `import '@/global.css'` (src/app/_layout.tsx) — TypeScript
// (moduleResolution: bundler) không tự biết cách type 1 file .css, dù Metro/NativeWind xử lý được lúc
// bundle thật. Không liên quan CSS Modules (không dùng ở dự án này — xem src/components/README.md, style
// đi qua className/Tailwind, không có *.module.css).
declare module '*.css';
