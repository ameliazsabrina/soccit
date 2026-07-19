import { defineConfig } from "vitest/config";

export default defineConfig({
  css: { postcss: { plugins: [] } },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    env: {
      // Session auth needs a JWT secret at config-load time; use a fixed test one.
      SESSION_JWT_SECRET: "test-session-secret",
    },
  },
});
