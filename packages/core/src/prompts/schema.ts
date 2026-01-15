// packages/core/src/prompts/schema.ts
// Zod schema validation for prompts

import { z } from "zod";

export const PromptCategorySchema = z.enum([
  "ideation",
  "documentation",
  "automation",
  "refactoring",
  "testing",
  "debugging",
  "workflow",
  "communication",
]);

export const PromptDifficultySchema = z.enum(["beginner", "intermediate", "advanced"]);

export const PromptVariableTypeSchema = z.enum(["text", "multiline", "select", "file", "path"]);

export const PromptVariableSchema = z.object({
  name: z.string().regex(/^[A-Z0-9_]+$/, "Variable names must be UPPER_SNAKE_CASE"),
  label: z.string().min(1),
  description: z.string().optional(),
  type: PromptVariableTypeSchema,
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  default: z.string().optional(),
});

export const PromptChangeSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be semantic (x.y.z)"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be ISO 8601 (YYYY-MM-DD)"),
  type: z.enum(["improvement", "fix", "breaking"]),
  summary: z.string().min(1),
});

export const PromptSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "ID must be lowercase kebab-case"),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(200),
  category: PromptCategorySchema,
  tags: z.array(z.string().regex(/^[a-z0-9-]+$/, "Tags must be lowercase kebab-case")).min(1),
  author: z.string().min(1),
  twitter: z.string().regex(/^@[a-zA-Z0-9_]+$/).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  featured: z.boolean().optional(),
  difficulty: PromptDifficultySchema.optional(),
  estimatedTokens: z.number().positive().optional(),
  created: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  content: z.string().min(1),
  variables: z.array(PromptVariableSchema).optional(),
  whenToUse: z.array(z.string()).optional(),
  tips: z.array(z.string()).optional(),
  examples: z.array(z.string()).optional(),
  changelog: z.array(PromptChangeSchema).optional(),
});

export function validatePrompt(prompt: unknown): z.infer<typeof PromptSchema> {
  return PromptSchema.parse(prompt);
}

export function validatePrompts(prompts: unknown[]): z.infer<typeof PromptSchema>[] {
  return prompts.map(validatePrompt);
}
