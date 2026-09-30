const { z } = require("zod");

const createKnowledgeSourceSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title cannot exceed 200 characters"),
    type: z.enum(["PDF", "PPTX", "DOCX", "TXT", "YOUTUBE"], {
      errorMap: () => ({
        message: "Type must be one of PDF, PPTX, DOCX, TXT, or YOUTUBE",
      }),
    }),
    youtubeUrl: z.string().trim().url("Invalid YouTube URL").optional(),
  })
  .superRefine((data, context) => {
    if (data.type === "YOUTUBE" && !data.youtubeUrl) {
      context.addIssue({
        code: "custom",
        path: ["youtubeUrl"],
        message: "YouTube URL is required when type is YOUTUBE",
      });
    }
  });

const updateKnowledgeSourceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title cannot exceed 200 characters"),
});

module.exports = {
  createKnowledgeSourceSchema,
  updateKnowledgeSourceSchema,
};
