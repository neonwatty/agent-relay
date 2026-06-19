import { z } from "zod"

export const SUMMARY_LIMIT = 500
export const DETAILS_LIMIT = 16 * 1024
export const TAG_LIMIT = 20
export const LINK_LIMIT = 20
export const DEFAULT_LATEST_LIMIT = 20
export const DEFAULT_SEARCH_LIMIT = 100
export const MAX_QUERY_LIMIT = 500

export const statusSchema = z.enum(["info", "todo", "active", "blocked", "done", "failed", "superseded"])

export const linkSchema = z.union([
  z.object({ kind: z.literal("file"), path: z.string().min(1), url: z.undefined().optional() }),
  z.object({ kind: z.literal("url"), url: z.string().url(), path: z.undefined().optional() })
])

export const publishEventSchema = z.object({
  project: z.string().min(1).optional(),
  session: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  type: z.string().min(1),
  status: statusSchema,
  summary: z.string().min(1).max(SUMMARY_LIMIT),
  details: z.string().max(DETAILS_LIMIT).optional(),
  tags: z.array(z.string().min(1)).max(TAG_LIMIT).default([]),
  links: z.array(linkSchema).max(LINK_LIMIT).default([])
})

export const eventQuerySchema = z.object({
  project: z.string().min(1).optional(),
  session: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  status: statusSchema.optional(),
  tag: z.string().min(1).optional(),
  since: z.string().datetime().optional(),
  limit: z.number().int().positive().max(MAX_QUERY_LIMIT).optional()
})
