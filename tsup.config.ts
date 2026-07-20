import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "trigger/index": "src/trigger/index.ts",
    "ai/index": "src/ai/index.ts",
    "ai/trigger": "src/ai/trigger.ts",
    "ai/workflow": "src/ai/workflow.ts",
    "workflow/index": "src/workflow/index.ts",
    "schemas/index": "src/schemas/index.ts",
    "eve/index": "src/eve/index.ts",
    "eve/agent/index": "src/eve/agent/index.ts",
    "eve/tools/index": "src/eve/tools/index.ts",
    "eve/tools/inbox/index": "src/eve/tools/inbox/index.ts",
    "eve/tools/inbox/create-task": "src/eve/tools/inbox/create-task.ts",
    "eve/tools/identity/index": "src/eve/tools/identity/index.ts",
    "eve/tools/identity/whoami": "src/eve/tools/identity/whoami.ts",
    "eve/tools/identity/my-access": "src/eve/tools/identity/my-access.ts",
    "eve/tools/catalog/search-products":
      "src/eve/tools/catalog/search-products.ts",
    "eve/tools/catalog/generate-random-chart":
      "src/eve/tools/catalog/generate-random-chart.ts",
    "eve/tools/catalog/generate-image":
      "src/eve/tools/catalog/generate-image.ts",
    "eve/tools/admin/manage-team-members":
      "src/eve/tools/admin/manage-team-members.ts",
    "eve/tools/admin/manage-groups":
      "src/eve/tools/admin/manage-groups.ts",
    "eve/tools/admin/query-tasks": "src/eve/tools/admin/query-tasks.ts",
    "eve/tools/admin/assign-tasks": "src/eve/tools/admin/assign-tasks.ts",
    "eve/tools/admin/get-workspace-usage":
      "src/eve/tools/admin/get-workspace-usage.ts",
    "agent-admin": "src/agent-admin.ts",
  },
  format: ["esm"],
  dts: {
    resolve: true,
  },
  clean: false,
  sourcemap: true,
  splitting: false,
  noExternal: ["@robotrock/core"],
  external: [
    "@opentelemetry/api",
    "@trigger.dev/sdk",
    "@openrouter/ai-sdk-provider",
    "ai",
    "workflow",
    "eve",
  ],
});
