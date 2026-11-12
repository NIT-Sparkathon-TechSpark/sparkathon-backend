import { z } from "zod";

/**
 * The format of data/tasks/<set>.json, written by P4 and loaded by `pnpm db:seed`.
 * The file name must match `set`: data/tasks/logic.json has "set": "logic".
 */

const answerIndex = z.number().int().min(0).max(3);

export const taskFileTaskSchema = z.object({
  // Stable id, "<set>-<two digits>", e.g. "logic-01". Never reuse an id for a different question.
  id: z.string().regex(/^[a-z0-9-]+-\d{2,}$/, 'Use "<set>-01" style ids'),
  position: z.number().int().min(1),
  category: z.string().min(1),
  difficulty: z.number().int().min(1).max(3),
  prompt: z.string().min(1),
  context: z.string().min(1).nullable(),
  options: z.array(z.string().min(1)).length(4),
  correct_index: answerIndex,
  advice: z.object({
    index: answerIndex,
    confidence: z.number().int().min(0).max(100).nullable(),
    explanation: z.string().min(1),
    source: z.enum(["recorded", "seeded"]),
    model: z.string().min(1).nullable(),
  }),
  verified_by: z.string().min(1).nullable(),
});

export const taskFileSchema = z
  .object({
    set: z.string().regex(/^[a-z0-9-]+$/, "Lowercase letters, digits and dashes only"),
    name: z.string().min(1),
    tasks: z.array(taskFileTaskSchema).min(1),
  })
  .superRefine((file, ctx) => {
    const ids = new Set<string>();
    const positions = new Set<number>();
    file.tasks.forEach((task, i) => {
      if (!task.id.startsWith(`${file.set}-`)) {
        ctx.addIssue({
          code: "custom",
          path: ["tasks", i, "id"],
          message: `Id must start with "${file.set}-"`,
        });
      }
      if (ids.has(task.id)) {
        ctx.addIssue({ code: "custom", path: ["tasks", i, "id"], message: "Duplicate id" });
      }
      if (positions.has(task.position)) {
        ctx.addIssue({
          code: "custom",
          path: ["tasks", i, "position"],
          message: "Duplicate position",
        });
      }
      if (new Set(task.options).size !== task.options.length) {
        ctx.addIssue({
          code: "custom",
          path: ["tasks", i, "options"],
          message: "Options must all be different",
        });
      }
      ids.add(task.id);
      positions.add(task.position);
    });
  });

export type TaskFile = z.infer<typeof taskFileSchema>;
export type TaskFileTask = z.infer<typeof taskFileTaskSchema>;
