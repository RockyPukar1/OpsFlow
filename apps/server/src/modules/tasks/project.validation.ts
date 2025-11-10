import z from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters").trim(),
  description: z.string().optional(),
  memberIds: z.array(z.string()).optional().default([]),
});

export const updateProjectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters").trim(),
  description: z.string().optional(),
  status: z.enum(["active", "archived"]).optional(),
});

export const addMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
