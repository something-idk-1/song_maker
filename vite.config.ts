import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 표준 Vite + React 설정. 별도 프록시/환경변수 세팅은 필요해지면 여기에 추가.
export default defineConfig({
  plugins: [react()],
});
