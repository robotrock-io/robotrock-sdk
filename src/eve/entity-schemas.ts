import { z } from "zod";

/** Tenant-relative inbox deep link for a task (matches dashboard inbox hrefs). */
export function buildTenantTaskUrl(
  tenantSlug: string,
  task: { id: string; type?: string | null; app?: string | null }
): string {
  const q = new URLSearchParams();
  if (task.app && task.app !== "default") {
    q.set("app", task.app);
  }
  if (task.type?.trim()) {
    q.set("type", task.type.trim());
  }
  q.set("selected", task.id);
  return `/${tenantSlug}/inbox?${q.toString()}`;
}

/** Tenant-relative group detail path (matches tenantGroup widget). */
export function buildTenantGroupUrl(tenantSlug: string, slug: string): string {
  return `/${tenantSlug}/team/groups/${slug}`;
}

const agentOnlyFields = {
  replyGuidance: z.string().optional(),
} as const;

function withAgentOnlyFields<T extends z.ZodRawShape>(shape: T) {
  return z.object({
    ...shape,
    ...agentOnlyFields,
  });
}

/** Demo catalog product row (`search_products`). */
export const productEntityRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number(),
  currency: z.string().min(1),
  inStock: z.boolean(),
  url: z.string().min(1),
});

/**
 * One wide-format chart point for OpenUI / shadcn charts.
 * Include the x-axis field (`date` / `category` / `label`) plus one numeric
 * field per series key listed in `yKeys` (e.g. `{ date, NL: 100, BE: 40 }`).
 * Never use long-format rows like `{ date, country: "NL", visitors: 100 }`.
 */
export const metricPointEntityRowSchema = z
  .object({
    date: z
      .string()
      .optional()
      .describe("X-axis value when xKey is date/time"),
    category: z
      .string()
      .optional()
      .describe("X-axis value when xKey is category"),
    label: z.string().optional().describe("X-axis value when xKey is label"),
  })
  .catchall(z.union([z.string(), z.number()]))
  .describe(
    "Wide chart point: x-axis field + numeric columns named by yKeys (one series per column)"
  );

/**
 * Canonical chart tool `outputSchema` for OpenUI chart components.
 *
 * Attach on chart tools: `outputSchema: toolChartResultSchema`.
 * Build values with `formatToolChartResult` / `formatToolChartResultFromLong`.
 *
 * Multi-series = multiple numeric columns on the same row, not a dimension column.
 */
export const toolChartResultSchema = withAgentOnlyFields({
  title: z.string().min(1).optional().describe("Chart title shown above the plot"),
  description: z
    .string()
    .min(1)
    .optional()
    .describe("Optional short subtitle"),
  type: z
    .enum(["line", "bar", "area", "pie", "radar", "radial"])
    .describe(
      "OpenUI/shadcn chart variant (time series → line, categories → bar, share → pie/radial, polar multi-series → radar)"
    ),
  xKey: z
    .string()
    .min(1)
    .describe('Field on each series row for the x-axis, e.g. "date" or "category"'),
  yKeys: z
    .array(z.string().min(1))
    .min(1)
    .describe(
      'Numeric series column names on each row, e.g. ["NL","BE"] or ["created","handled"]'
    ),
  series: z
    .array(metricPointEntityRowSchema)
    .describe(
      "Wide-format points only — one object per x value with yKeys as numeric fields"
    ),
});

export const memberEntityRowSchema = z.object({
  name: z.string(),
  email: z.string(),
  role: z.string(),
  membershipKind: z.string(),
  profilePictureUrl: z.string().nullable(),
});

export const taskEntityRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: z.string().min(1),
  type: z.string().nullable(),
  description: z.string().nullable(),
  validUntil: z.number(),
  createdAt: z.number(),
  url: z.string().min(1),
  threadPriority: z.string().nullable().optional(),
});

export const groupEntityRowSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable(),
  memberCount: z.number().nullable(),
  url: z.string().min(1),
});

export const groupDetailEntitySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable(),
  url: z.string().min(1),
  members: z.array(
    z.object({
      name: z.string(),
      email: z.string(),
      profilePictureUrl: z.string().nullable(),
    })
  ),
});

/** Assign-task / status list row — always includes task inbox url. */
export const statusEntityRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: z.string().min(1),
  url: z.string().min(1),
  type: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const agentAdminErrorResultSchema = z.object({
  ok: z.literal(false),
  status: z.number().optional(),
  message: z.string(),
  response: z.unknown().optional(),
});

export const agentAdminMutationResultSchema = z
  .object({
    ...agentOnlyFields,
  })
  .passthrough();

export const searchProductsOutputSchema = withAgentOnlyFields({
  items: z.array(productEntityRowSchema),
});

export const generateRandomChartOutputSchema = toolChartResultSchema.extend({
  title: z.string().min(1),
});

/** Demo generated image (`generate_image`) — bytes live in Convex `_storage`. */
export const generateImageOutputSchema = withAgentOnlyFields({
  prompt: z.string().min(1),
  mediaType: z.string().min(1),
  model: z.string().min(1),
  storageId: z.string().min(1),
  url: z.string().min(1),
  /** @deprecated Legacy sessions only — prefer storageId/url. */
  base64: z.string().min(1).optional(),
});

export const manageTeamMembersListOutputSchema = withAgentOnlyFields({
  members: z.array(memberEntityRowSchema),
});

export const manageTeamMembersDetailOutputSchema = withAgentOnlyFields(
  memberEntityRowSchema.shape
);

export const manageTeamMembersOutputSchema = z.union([
  manageTeamMembersListOutputSchema,
  manageTeamMembersDetailOutputSchema,
  agentAdminMutationResultSchema,
  agentAdminErrorResultSchema,
]);

export const manageGroupsListOutputSchema = withAgentOnlyFields({
  groups: z.array(groupEntityRowSchema),
});

export const manageGroupsDetailOutputSchema = withAgentOnlyFields(
  groupDetailEntitySchema.shape
);

export const manageGroupsSummaryOutputSchema = withAgentOnlyFields(
  groupEntityRowSchema.shape
);

export const manageGroupsOutputSchema = z.union([
  manageGroupsListOutputSchema,
  manageGroupsDetailOutputSchema,
  manageGroupsSummaryOutputSchema,
  agentAdminMutationResultSchema,
  agentAdminErrorResultSchema,
]);

export const queryTasksListOutputSchema = withAgentOnlyFields({
  items: z.array(taskEntityRowSchema),
  nextCursor: z.string().nullable().optional(),
});

export const queryTasksDetailOutputSchema = withAgentOnlyFields({
  id: z.string().nullable(),
  status: z.string().nullable(),
  type: z.string().nullable(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  validUntil: z.number().nullable(),
  createdAt: z.number().nullable(),
  url: z.string().min(1).nullable(),
});

export const queryTasksOutputSchema = z.union([
  queryTasksListOutputSchema,
  queryTasksDetailOutputSchema,
  agentAdminErrorResultSchema,
]);

export const assignTasksOutputSchema = z.union([
  withAgentOnlyFields({
    results: z.array(statusEntityRowSchema),
  }),
  agentAdminErrorResultSchema,
]);

export const workspaceUsageEntitySchema = z.object({
  workspace: z.string(),
  plan: z.string(),
  planType: z.string(),
  trialState: z.string(),
  daysRemaining: z.number().nullable(),
  isPaidPro: z.boolean(),
  subscriptionStatus: z.string(),
  tasksToday: z.string(),
  tasksResetAt: z.string(),
  openTasks: z.number(),
  totalTasks: z.number(),
  seats: z.string(),
  groups: z.string(),
  apiKeys: z.string(),
  rateLimitPerSecond: z.number(),
});

export const getWorkspaceUsageOutputSchema = z.union([
  withAgentOnlyFields({
    usage: workspaceUsageEntitySchema,
  }),
  agentAdminErrorResultSchema,
]);

export type ProductEntityRow = z.infer<typeof productEntityRowSchema>;
export type MetricPointEntityRow = z.infer<typeof metricPointEntityRowSchema>;
export type ToolChartResult = z.infer<typeof toolChartResultSchema>;
export type MemberEntityRow = z.infer<typeof memberEntityRowSchema>;
export type TaskEntityRow = z.infer<typeof taskEntityRowSchema>;
export type GroupEntityRow = z.infer<typeof groupEntityRowSchema>;
export type StatusEntityRow = z.infer<typeof statusEntityRowSchema>;
