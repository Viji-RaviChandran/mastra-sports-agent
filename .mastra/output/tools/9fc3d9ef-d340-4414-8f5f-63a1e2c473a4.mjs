import { z } from 'zod';

const inputSchema = z.object({
  columns: z.array(z.string()).describe("Un-aggregated columns to select").default([]),
  metrics: z.array(
    z.object({
      field: z.string().describe("Column to aggregate"),
      aggregation: z.enum(["COUNT", "SUM", "AVG", "MIN", "MAX"]),
      alias: z.string()
    })
  ).default([]),
  filters: z.array(
    z.object({
      field: z.string(),
      operator: z.enum(["=", "!=", ">", "<", ">=", "<=", "LIKE", "NOT"]),
      value: z.union([z.string(), z.number()])
    })
  ).default([]),
  orderBy: z.object({
    field: z.string(),
    direction: z.enum(["ASC", "DESC"])
  }).optional(),
  limit: z.number().optional()
});
const outputSchema = z.array(
  z.record(z.string(), z.any())
);

export { inputSchema, outputSchema };
