// import react from "@vitejs/plugin-react";
// import { defineConfig, loadEnv } from "vite";

// export default defineConfig(({ mode }) => {
//   const env = loadEnv(mode, process.cwd(), "VITE_");
//   const apiOrigin = new URL(
//     env.VITE_API_BASE_URL || "http://localhost:3000/api",
//   ).origin;

//   return {
//     plugins: [react()],
//     server: {
//       port: 5173,
//       strictPort: true,
//       proxy: {
//         "/api": {
//           target: apiOrigin,
//           changeOrigin: true,
//         },
//       },
//     },
//   };
// });


import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Los endpoints ya incluyen /api; el proxy utiliza únicamente el origen.
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiOrigin = new URL(env.VITE_API_BASE_URL || "http://localhost:3000", "http://localhost:3000").origin;

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": { target: apiOrigin, changeOrigin: true },
      },
    },
  };
});
