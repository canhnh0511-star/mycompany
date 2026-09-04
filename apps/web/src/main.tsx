import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Tự host Inter (thay vì gọi Google Fonts qua network) — tránh phụ thuộc
// mạng ngoài lúc runtime (một số môi trường mạng chặn fonts.googleapis.com,
// khi đó trình duyệt rơi về Arial/system font trông nặng/đậm hơn thiết kế).
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './index.css';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
