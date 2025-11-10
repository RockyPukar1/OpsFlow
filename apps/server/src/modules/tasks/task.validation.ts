import z from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(3, "Task title must be at least 3 characters").trim(),
  description: z.string().optional(),
  status: z.enum(["todo", "in-progress", "review", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assignee: z.string().optional(),
  projectId: z.string().min(1, "Project ID is required"),
  dueDate: z.iso.datetime().optional(),
  tags: z.array(z.string()).optional().default([]),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .min(3, "Task title must be at least 3 characters")
    .trim()
    .optional(),
  description: z.string().optional(),
  status: z.enum(["todo", "in-progress", "review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  assignee: z.string().optional(),
  dueDate: z.iso.datetime().optional(),
  tags: z.array(z.string()).optional(),
});

export const taskFilterSchema = z.object({
  projectId: z.string().optional(),
  status: z.enum(["todo", "in-progress", "review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  assignee: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskFilterInput = z.infer<typeof taskFilterSchema>;
