const { z } = require("zod");

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/, "Invalid username format")
    .min(3)
    .max(32)
    .optional(),
  avatar: z.string().trim().max(500).optional(),
});

module.exports = { updateProfileSchema };
