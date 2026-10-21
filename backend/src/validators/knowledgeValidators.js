const { z } = require("zod");

const createKnowledgeSourceSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title cannot exceed 200 characters"),
    type: z.enum(["PDF", "IMAGE", "PPTX", "PPT", "DOCX", "DOC", "TXT", "YOUTUBE"], {
      errorMap: () => ({
        message: "Type must be one of PDF, IMAGE, PPTX, PPT, DOCX, DOC, TXT, or YOUTUBE",
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

const importYouTubeSchema = z.object({
  url: z
    .string({ message: "YouTube URL is required" })
    .trim()
    .min(1, "YouTube URL is required")
    .max(2048, "URL is too long"),
  title: z.string().trim().max(200, "Title cannot exceed 200 characters").optional(),
  language: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,4})?$/, "Language must be a code like en or pt-BR")
    .optional(),
  reprocess: z.boolean().optional(),
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
  importYouTubeSchema,
  updateKnowledgeSourceSchema,
};
